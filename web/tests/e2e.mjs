// End-to-end API test of the full event lifecycle against a running app with freshly seeded demo data.
//   MONGO_DB=collabsphere_test npm run seed   (or the CI Mongo service)
//   npm run dev  /  npm start
//   BASE_URL=http://localhost:3000 npm run test:e2e
// It writes data, so it refuses to run against the production deployment.
const B = process.env.BASE_URL || 'http://localhost:3000';
if (/vercel\.app/.test(B)) {
  console.error(`Refusing to run write tests against ${B}`);
  process.exit(1);
}

let fails = 0;
const call = async (as, method, path, body, raw) => {
  const res = await fetch(B + path, {
    method, redirect: 'manual',
    headers: { ...(as && { Cookie: `devUser=${as}` }), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text, headers: res.headers };
};
const check = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  - ${extra}` : ''}`);
};
const sarandaPts = async () => Number((await call(null, 'GET', '/leaderboard')).text.match(/<b>Saranda<\/b>.*?(\d+)(?:<!-- -->)? pts/)?.[1]);

const approved = (await call(null, 'GET', '/api/events?status=approved')).json;
const proposed = (await call(null, 'GET', '/api/events?status=proposed')).json;
const faceEvent = approved.find((e) => e.requireFace);
const seededProposal = proposed.find((e) => e.title.startsWith('UP Regional'));
check('seeded demo data present', !!faceEvent && !!seededProposal, `${approved.length} approved, ${proposed.length} proposed`);

// 1. Coordinator proposes a joint event with a partner society
const p = await call('lucknow-coord', 'POST', '/api/events', {
  title: 'E2E Joint Meetup', city: 'Lucknow', venue: 'Test Cafe', kind: 'joint-event', startsAt: '2030-01-05T18:30',
  lat: '26.8500', lng: '80.9460', hostHouses: ['Kaziranga'], partners: 'Coding Club, Coding Club, Music Society', points: 15,
});
const ev = p.json;
check('coordinator proposes event', p.status === 201, `${p.status}`);
check('start time stored as IST', ev.startsAt === '2030-01-05T13:00:00.000Z', ev.startsAt);
check('hosts = own house + co-host', JSON.stringify(ev.hostHouses) === '["Saranda","Kaziranga"]', JSON.stringify(ev.hostHouses));
check('partner societies parsed', JSON.stringify(ev.partners) === '["Coding Club","Music Society"]', JSON.stringify(ev.partners));
const page = await call('lucknow-coord', 'GET', `/events/${ev._id}`);
check('event page shows pending houses and IST time', /Waiting for approval from/.test(page.text) && page.text.includes('Sat, 5 Jan, 6:30 pm'));

// 2. Every host house approves
let a = await call('saranda-admin', 'POST', `/api/events/${ev._id}/approve`);
check('Saranda approves, still proposed', a.status === 200 && a.json.status === 'proposed', a.json.status);
a = await call('saranda-admin', 'POST', `/api/events/${ev._id}/approve`);
check('repeat approval is idempotent', a.status === 200 && a.json.approvals.length === 1);
check('no RSVPs before approval', (await call('member-1', 'POST', `/api/events/${ev._id}/rsvp`)).status === 404);
a = await call('kaziranga-admin', 'POST', `/api/events/${ev._id}/approve`);
check('Kaziranga approves, event goes live', a.status === 200 && a.json.status === 'approved', a.json.status);
check('approving a live event is refused', (await call('kaziranga-admin', 'POST', `/api/events/${ev._id}/approve`)).status === 409);
check('live event listed on the map page', (await call(null, 'GET', '/')).text.includes('E2E Joint Meetup'));

// 3. Admin proposals count as their own house's approval
const ap = await call('saranda-admin', 'POST', '/api/events', { title: 'E2E Admin Coworking', city: 'Chennai', startsAt: '2030-02-01T10:00', lat: '13.08', lng: '80.27', kind: 'coworking' });
check('admin proposal for own house goes live at once', ap.status === 201 && ap.json.status === 'approved', ap.json.status);

// 4. RSVP and calendar
let r = await call('member-1', 'POST', `/api/events/${ev._id}/rsvp`);
check('member RSVPs', r.status === 200 && r.json.rsvps.length === 1);
r = await call('member-1', 'POST', `/api/events/${ev._id}/rsvp`);
check('RSVP twice counts once', r.json.rsvps.length === 1);
check('RSVP to a pending proposal refused', (await call('member-1', 'POST', `/api/events/${seededProposal._id}/rsvp`)).status === 404);
const ics = await call(null, 'GET', `/api/events/${ev._id}/ics`);
check('calendar file for live event', ics.status === 200 && /text\/calendar/.test(ics.headers.get('content-type')) && ics.text.includes('DTSTART:20300105T130000Z'));
check('no calendar file for a proposal', (await call(null, 'GET', `/api/events/${seededProposal._id}/ics`)).status === 404);

// 5. Rotating QR + geofenced check-in
const before = await sarandaPts();
const qr = await call('lucknow-coord', 'GET', `/api/events/${ev._id}/qr`);
check('host gets rotating QR token', qr.status === 200 && /^\w{24}\.\d+\.[\w-]{16}$/.test(qr.json.token));
check('member cannot get QR', (await call('member-1', 'GET', `/api/events/${ev._id}/qr`)).status === 403);
let c = await call('member-2', 'POST', '/api/checkin', { token: qr.json.token, lng: 80.33, lat: 26.45 });
check('check-in far from venue refused', c.status === 403 && /Too far/.test(c.json.error), c.json.error);
c = await call('member-1', 'POST', '/api/checkin', { token: qr.json.token, lng: 80.9465, lat: 26.8502 });
check('member checks in at the venue', c.status === 201 && c.json.pointsEarned === 15, JSON.stringify(c.json));
check('second check-in refused', (await call('member-1', 'POST', '/api/checkin', { token: qr.json.token, lng: 80.9465, lat: 26.8502 })).status === 409);
const tampered = qr.json.token.slice(0, -1) + (qr.json.token.endsWith('A') ? 'B' : 'A');
check('tampered QR refused', (await call('member-2', 'POST', '/api/checkin', { token: tampered, lng: 80.9465, lat: 26.8502 })).status === 400);
const after = await sarandaPts();
check('house earns the event points', after - before === 15, `${before} -> ${after}`);
check('profile shows attendance and a badge', /First check-in/.test((await call('member-1', 'GET', '/profile')).text));

// 6. Attendance export
const csv = await call('saranda-admin', 'GET', `/api/events/${ev._id}/attendance`);
check('host admin downloads attendance CSV', csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type')) && /Demo Member,Saranda,Lucknow,yes,yes/.test(csv.text));
check('members cannot download attendance', (await call('member-1', 'GET', `/api/events/${ev._id}/attendance`)).status === 403);
check('non-host admins cannot download attendance', (await call('kaziranga-admin', 'GET', `/api/events/${faceEvent._id}/attendance`)).status === 403);

// 7. Face-check events
const fq = await call('lucknow-coord', 'GET', `/api/events/${faceEvent._id}/qr`);
const [fx, fy] = faceEvent.location.coordinates;
c = await call('member-2', 'POST', '/api/checkin', { token: fq.json.token, lng: fx, lat: fy });
check('face-check event asks for liveness (428)', c.status === 428, c.json.error);
c = await call('member-2', 'POST', '/api/checkin', { token: fq.json.token, lng: fx, lat: fy, faceVerified: true, selfie: 'data:image/png;base64,AAAA' });
check('non-JPEG selfie refused', c.status === 400, c.json.error);

// 8. Hardening
check('forged cookie for a non-demo user is ignored', (await call('gir-1', 'GET', '/api/users/nearby')).status === 401);
check('malformed id -> 404', (await call('saranda-admin', 'POST', '/api/events/bad/approve')).status === 404);
check('missing event QR -> 404', (await call('lucknow-coord', 'GET', '/api/events/000000000000000000000000/qr')).status === 404);
check('non-JSON body -> 400', (await call('member-1', 'POST', '/api/checkin', undefined, 'x')).status === 400);
check('invalid proposal -> 400', (await call('lucknow-coord', 'POST', '/api/events', { title: 'x', city: 'y', lat: '', lng: '1', startsAt: '2030-01-01T10:00' })).status === 400);
check('logged-out /propose -> sign-in', (await call(null, 'GET', '/propose')).headers.get('location')?.includes('/signin?callbackUrl=/propose'));

console.log(`\n${fails ? `${fails} FAILED` : 'ALL PASSED'}`);
process.exit(fails ? 1 : 0);
