import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Event, User, CheckIn, purgeOldSelfies, SELFIE_RETENTION_DAYS } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { isValidObjectId } from 'mongoose';
import { ROLES, HOUSE_OPTIONS } from '@/lib/houses';
import { formatWhen, toISTInput } from '@/lib/time';
import { adminApprove, adminReject, adminUpdateEvent, adminUpdateUser, adminRevokeCheckIn, adminSetEventStatus } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

const TABS = ['approvals', 'events', 'members', 'check-ins'];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default async function AdminPage({ searchParams }) {
  const me = await getCurrentUser();
  if (!me) redirect('/signin?callbackUrl=/admin');
  if (me.role !== 'admin') redirect('/');
  const params = await searchParams;
  const tab = TABS.includes(params.tab) ? params.tab : 'approvals';
  await connectDB();
  await purgeOldSelfies();

  const house = me.house;
  const [pending, events, members, checkIns, stats] = await Promise.all([
    Event.find({ status: 'proposed', hostHouses: house }).sort({ createdAt: -1 }).populate('proposedBy', 'name'),
    Event.find({ status: { $in: ['approved', 'cancelled'] }, hostHouses: house }).sort({ startsAt: -1 }).limit(50),
    User.find({ house }).sort({ points: -1 }),
    CheckIn.find({}).select('+selfie').sort({ createdAt: -1 }).limit(100).populate('event', 'title hostHouses').populate('user', 'name house'),
    Promise.all([
      Event.countDocuments({ status: 'approved', hostHouses: house }),
      User.countDocuments({ house }),
      CheckIn.countDocuments({ revoked: false }),
    ]),
  ]);
  const myCheckIns = checkIns.filter((c) => c.event?.hostHouses.includes(house));

  // Attendee panel for one event (events tab, ?event=<id>)
  const selected = tab === 'events' && isValidObjectId(params.event) ? events.find((e) => e._id.equals(params.event)) : null;
  const [rsvpUsers, eventCheckIns] = selected ? await Promise.all([
    User.find({ _id: { $in: selected.rsvps } }).select('name house city').sort({ name: 1 }),
    CheckIn.find({ event: selected._id }).sort({ createdAt: 1 }).populate('user', 'name house'),
  ]) : [[], []];
  const checkedIn = new Map(eventCheckIns.map((c) => [String(c.user?._id), c]));
  const checkInText = (c) => (c.revoked ? 'revoked' : `${formatWhen(c.createdAt)}${c.faceVerified ? ' · face ✓' : ''}`);

  return (
    <div className="admin">
      <header className="admin-head">
        <h1>{house} admin</h1>
        <div className="stats">
          <div><b>{pending.length}</b><span>pending</span></div>
          <div><b>{stats[0]}</b><span>live events</span></div>
          <div><b>{stats[1]}</b><span>members</span></div>
          <div><b>{myCheckIns.filter((c) => !c.revoked).length}</b><span>recent check-ins</span></div>
        </div>
        <nav className="tabs" aria-label="Admin sections">
          {TABS.map((t) => <Link key={t} href={`/admin?tab=${t}`} className={t === tab ? 'active' : ''}>{t}</Link>)}
        </nav>
      </header>

      {tab === 'approvals' && (
        <section>
          {!pending.length && <p className="muted">Nothing waiting for {house}.</p>}
          {pending.map((e) => {
            const approved = e.approvals.map((a) => a.house);
            return (
              <div key={e._id} className="card">
                <b>{e.title}</b>
                <span>{e.kind} · {e.city} · {formatWhen(e.startsAt)} · by {e.proposedBy?.name}</span>
                <span>Hosts: {e.hostHouses.map((h) => `${h}${approved.includes(h) ? ' ✓' : ' …'}`).join(' × ')}</span>
                {!approved.includes(house) && (
                  <div className="row">
                    <form action={adminApprove.bind(null, String(e._id))}><button>Approve for {house}</button></form>
                    <form action={adminReject.bind(null, String(e._id))}><button className="ghost">Reject</button></form>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {tab === 'events' && selected && (
        <section className="panel attendees">
          <Link href="/admin?tab=events" className="back">← All events</Link>
          <h2>{selected.title}</h2>
          <p className="muted">{selected.city} · {formatWhen(selected.startsAt)} · {plural(selected.rsvps.length, 'RSVP')} · {eventCheckIns.filter((c) => !c.revoked).length} checked in</p>
          <a className="btn ghost" href={`/api/events/${selected._id}/attendance`} download>Download attendance (CSV)</a>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>House</th><th>RSVP</th><th>Checked in</th></tr></thead>
              <tbody>
                {!rsvpUsers.length && !eventCheckIns.length && <tr><td colSpan={4} className="muted">No RSVPs or check-ins yet.</td></tr>}
                {rsvpUsers.map((u) => {
                  const c = checkedIn.get(String(u._id));
                  return <tr key={u._id}><td>{u.name}</td><td>{u.house}</td><td>✓</td><td>{c ? checkInText(c) : '—'}</td></tr>;
                })}
                {eventCheckIns.filter((c) => !selected.rsvps.some((r) => r.equals(c.user?._id))).map((c) => (
                  <tr key={c._id}><td>{c.user?.name}</td><td>{c.user?.house}</td><td>—</td><td>{checkInText(c)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'events' && !selected && (
        <section className="table-wrap">
          <table>
            <thead><tr><th>Title · venue · start (IST) · points · partner societies</th></tr></thead>
            <tbody>
              {!events.length && <tr><td className="muted">No live events yet.</td></tr>}
              {events.map((e) => (
                <tr key={e._id} className={e.status === 'cancelled' ? 'cancelled' : ''}>
                  <td>
                    <form action={adminUpdateEvent} className="inline-form">
                      <input type="hidden" name="id" value={String(e._id)} />
                      <input name="title" defaultValue={e.title} aria-label="Title" required />
                      <input name="venue" defaultValue={e.venue} aria-label="Venue" />
                      <input type="datetime-local" name="startsAt" defaultValue={toISTInput(e.startsAt)} aria-label="Starts at (IST)" required />
                      <input type="number" name="points" defaultValue={e.points} aria-label="Points" className="narrow" min={0} max={100} />
                      <input name="partners" defaultValue={e.partners.join(', ')} aria-label="Partner societies" placeholder="Partner societies" />
                      <label className="chip"><input type="checkbox" name="requireFace" defaultChecked={e.requireFace} /> Face check</label>
                      <button>Save</button>
                    </form>
                    <div className="inline-form row-actions">
                      {e.status === 'cancelled' && <span className="badge cancelled">cancelled</span>}
                      <Link href={`/admin?tab=events&event=${e._id}`}>Attendees ({plural(e.rsvps.length, 'RSVP')})</Link>
                      <Link href={`/events/${e._id}`}>Open event page</Link>
                      {e.status === 'approved' ? (
                        <form action={adminSetEventStatus.bind(null, String(e._id), 'cancelled')}>
                          <ConfirmButton message={`Cancel "${e.title}"? It disappears from the map and check-ins stop.`}>Cancel event</ConfirmButton>
                        </form>
                      ) : (
                        <form action={adminSetEventStatus.bind(null, String(e._id), 'approved')}><button className="ghost">Restore</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'members' && (
        <section className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>City</th><th>Points</th><th>Role · house · adjust points</th></tr></thead>
            <tbody>
              {members.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.city}</td>
                  <td>{u.points}</td>
                  <td>
                    <form action={adminUpdateUser} className="inline-form">
                      <input type="hidden" name="id" value={String(u._id)} />
                      <select name="role" defaultValue={u.role} aria-label="Role" disabled={u._id.equals(me._id)}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <select name="house" defaultValue={u.house} aria-label="House" disabled={u._id.equals(me._id)}>
                        {HOUSE_OPTIONS.map((h) => <option key={h}>{h}</option>)}
                      </select>
                      <input type="number" name="pointsDelta" placeholder="± pts" aria-label="Adjust points" className="narrow" />
                      <button>Update</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'check-ins' && (
        <section className="table-wrap">
          <p className="muted table-note">Selfies are only visible to host-house admins and are deleted after {SELFIE_RETENTION_DAYS} days.</p>
          <table>
            <thead><tr><th>When</th><th>Member</th><th>Event</th><th>Distance</th><th>Face</th><th /></tr></thead>
            <tbody>
              {!myCheckIns.length && <tr><td colSpan={6} className="muted">No check-ins yet.</td></tr>}
              {myCheckIns.map((c) => (
                <tr key={c._id} className={c.revoked ? 'revoked' : ''}>
                  <td>{formatWhen(c.createdAt)}</td>
                  <td>{c.user?.name} ({c.user?.house})</td>
                  <td>{c.event?.title}</td>
                  <td>{Math.round(c.distanceM)} m</td>
                  <td>
                    {c.selfie
                      ? <img src={c.selfie} alt={`Check-in selfie of ${c.user?.name}`} className="selfie" />
                      : c.faceVerified ? '✓' : '—'}
                  </td>
                  <td>{c.revoked ? 'revoked' : (
                    <form action={adminRevokeCheckIn.bind(null, String(c._id))}><button className="ghost">Revoke</button></form>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
