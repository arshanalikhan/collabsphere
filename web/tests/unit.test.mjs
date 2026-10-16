// Unit tests for the pure helpers (no database needed): node --test tests/unit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.QR_SECRET ||= 'unit-test-secret';
const { formatWhen, toISTInput, parseIST } = await import('../lib/time.js');
const { makeQrToken, verifyQrToken, haversine } = await import('../lib/qr.js');
const { parsePartners, canChangeOwnHouse, HOUSE_OPTIONS, NO_HOUSE } = await import('../lib/houses.js');
const { badgesFor } = await import('../lib/badges.js');
const { icsFor, googleCalendarUrl } = await import('../lib/calendar.js');

test('IST: datetime-local input is read as IST and round-trips', () => {
  const d = parseIST('2030-01-05T18:30');
  assert.equal(d.toISOString(), '2030-01-05T13:00:00.000Z');
  assert.equal(toISTInput(d), '2030-01-05T18:30');
  assert.equal(formatWhen(d), 'Sat, 5 Jan, 6:30 pm');
  assert.equal(parseIST('2030-01-05T13:00:00.000Z').toISOString(), '2030-01-05T13:00:00.000Z');
  assert.equal(parseIST(''), undefined);
});

test('QR tokens verify for their event and reject tampering', () => {
  const id = '6ace7ec3d1b247e40554a125';
  const token = makeQrToken(id);
  assert.equal(verifyQrToken(token), id);
  const [, slot, sig] = token.split('.');
  assert.equal(verifyQrToken(`6ace7ec3d1b247e40554a127.${slot}.${sig}`), null, 'token is bound to its event');
  assert.equal(verifyQrToken(`${id}.${Number(slot) - 5}.${sig}`), null, 'old slots expire');
  assert.equal(verifyQrToken(`${id}.${slot}.${sig.slice(0, -1)}x`), null, 'signature is checked');
  assert.equal(verifyQrToken(undefined), null);
});

test('haversine distance is about right', () => {
  const m = haversine([80.946, 26.85], [80.95, 26.85]);
  assert.ok(m > 350 && m < 450, `got ${m}`);
});

test('partner societies are trimmed, de-duplicated and capped', () => {
  assert.deepEqual(parsePartners(' Coding Club, Music Society,,Coding Club '), ['Coding Club', 'Music Society']);
  assert.equal(parsePartners('a,b,c,d,e,f,g').length, 5);
  assert.deepEqual(parsePartners(undefined), []);
});

test('members can pick their house only before earning points', () => {
  assert.ok(HOUSE_OPTIONS.includes(NO_HOUSE));
  assert.equal(canChangeOwnHouse({ role: 'member', points: 0 }), true);
  assert.equal(canChangeOwnHouse({ role: 'member', points: 10 }), false);
  assert.equal(canChangeOwnHouse({ role: 'coordinator', points: 0 }), false);
});

test('badges reward showing up', () => {
  const ev = (city, hostHouses = ['Saranda']) => ({ event: { city, hostHouses } });
  const names = (b) => b.map((x) => x.name);
  assert.deepEqual(names(badgesFor({ checkIns: [], organised: 0 })), []);
  assert.deepEqual(names(badgesFor({ checkIns: [ev('Lucknow')], organised: 0 })), ['First check-in']);
  const all = names(badgesFor({ checkIns: [ev('Lucknow'), ev('Kanpur'), ev('Lucknow', ['Saranda', 'Gir'])], organised: 1 }));
  assert.deepEqual(all, ['First check-in', 'Regular', 'Explorer', 'Bridge builder', 'Organiser']);
});

test('calendar exports escape text and use UTC times', () => {
  const e = { _id: 'abc', title: 'Meetup; with, commas', city: 'Lucknow', venue: 'Cafe', hostHouses: ['Saranda'],
    startsAt: '2030-01-05T13:00:00.000Z', location: { coordinates: [80.9, 26.8] } };
  const ics = icsFor(e, 'https://example.test/events/abc');
  assert.match(ics, /DTSTART:20300105T130000Z/);
  assert.match(ics, /DTEND:20300105T150000Z/);
  assert.match(ics, /SUMMARY:Meetup\\; with\\, commas/);
  assert.match(googleCalendarUrl(e, 'u'), /dates=20300105T130000Z%2F20300105T150000Z/);
});
