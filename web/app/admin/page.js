import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Event, User, CheckIn, purgeOldSelfies, SELFIE_RETENTION_DAYS } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { ROLES } from '@/lib/houses';
import { adminApprove, adminReject, adminUpdateEvent, adminUpdateUser, adminRevokeCheckIn } from '@/app/actions';

export const dynamic = 'force-dynamic';

const TABS = ['approvals', 'events', 'members', 'check-ins'];
const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');

export default async function AdminPage({ searchParams }) {
  const me = await getCurrentUser();
  if (me?.role !== 'admin') redirect('/');
  const tab = TABS.includes((await searchParams).tab) ? (await searchParams).tab : 'approvals';
  await connectDB();
  await purgeOldSelfies();

  const house = me.house;
  const [pending, events, members, checkIns, stats] = await Promise.all([
    Event.find({ status: 'proposed', hostHouses: house }).sort({ createdAt: -1 }).populate('proposedBy', 'name'),
    Event.find({ status: 'approved', hostHouses: house }).sort({ startsAt: -1 }).limit(50),
    User.find({ house }).sort({ points: -1 }),
    CheckIn.find({}).select('+selfie').sort({ createdAt: -1 }).limit(100).populate('event', 'title hostHouses').populate('user', 'name house'),
    Promise.all([
      Event.countDocuments({ status: 'approved', hostHouses: house }),
      User.countDocuments({ house }),
      CheckIn.countDocuments({ revoked: false }),
    ]),
  ]);
  const myCheckIns = checkIns.filter((c) => c.event?.hostHouses.includes(house));

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
                <span>{e.kind} · {e.city} · {new Date(e.startsAt).toLocaleString('en-IN')} · by {e.proposedBy?.name}</span>
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

      {tab === 'events' && (
        <section className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Venue</th><th>Starts</th><th>Pts</th><th>RSVPs</th><th /></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id}>
                  <td colSpan={6}>
                    <form action={adminUpdateEvent} className="inline-form">
                      <input type="hidden" name="id" value={String(e._id)} />
                      <input name="title" defaultValue={e.title} aria-label="Title" />
                      <input name="venue" defaultValue={e.venue} aria-label="Venue" />
                      <input type="datetime-local" name="startsAt" defaultValue={toLocalInput(e.startsAt)} aria-label="Starts at" />
                      <input type="number" name="points" defaultValue={e.points} aria-label="Points" className="narrow" />
                      <label className="chip"><input type="checkbox" name="requireFace" defaultChecked={e.requireFace} /> Face check</label>
                      <span>{e.rsvps.length} RSVPs</span>
                      <button>Save</button>
                    </form>
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
            <thead><tr><th>Member</th><th>City</th><th>Points</th><th>Role / adjust points</th></tr></thead>
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
                  <td>{new Date(c.createdAt).toLocaleString('en-IN')}</td>
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
