import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { CheckIn, Event } from '@/lib/models';
import { HOUSES, NO_HOUSE, canChangeOwnHouse } from '@/lib/houses';
import { badgesFor } from '@/lib/badges';
import { formatWhen } from '@/lib/time';
import { updateProfile } from '@/app/actions';
import LocationButton from '@/components/LocationButton';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect('/signin?callbackUrl=/profile');
  const [lng, lat] = me.location?.coordinates || [];
  const [checkIns, organised, going] = await Promise.all([
    CheckIn.find({ user: me._id, revoked: false }).sort({ createdAt: -1 }).populate('event', 'title city startsAt points hostHouses'),
    Event.countDocuments({ proposedBy: me._id, status: 'approved' }),
    Event.find({ rsvps: me._id, status: 'approved', startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }),
  ]);
  const badges = badgesFor({ checkIns, organised });
  const houseEditable = canChangeOwnHouse(me);

  return (
    <div className="stack">
      <form className="panel form" action={updateProfile}>
        <h1>Your profile</h1>
        {(!me.city || me.house === NO_HOUSE) && (
          <p className="notice">Welcome! Pick your house and city so we can show meetups and peers near you.</p>
        )}
        <p className="muted">{me.points} points earned{me.house !== NO_HOUSE && ` for ${me.house}`}</p>
        <label>Name<input name="name" defaultValue={me.name} required /></label>
        {houseEditable ? (
          <label>House
            <select name="house" defaultValue={me.house}>
              {HOUSES.map((h) => <option key={h}>{h}</option>)}
              <option value={NO_HOUSE}>Not allotted yet</option>
            </select>
            <small className="muted">You can change this until you earn your first points.</small>
          </label>
        ) : (
          <p className="field-static"><b>House</b><span>{me.house} · ask your house admin if this needs to change</span></p>
        )}
        <label>City<input name="city" defaultValue={me.city} /></label>
        <div className="row">
          <label>Latitude<input name="lat" defaultValue={lat} inputMode="decimal" /></label>
          <label>Longitude<input name="lng" defaultValue={lng} inputMode="decimal" /></label>
        </div>
        <LocationButton digits={2} />
        <p className="muted">Location is rounded to about 1 km. Peers only ever see your city.</p>
        <SubmitButton />
      </form>

      <section className="panel accent-top" style={{ '--accent-color': 'var(--sun)' }}>
        <h2>Your activity</h2>
        {badges.length ? (
          <ul className="badges">
            {badges.map((b) => <li key={b.name} title={b.why}><span aria-hidden>{b.icon}</span> {b.name}<small>{b.why}</small></li>)}
          </ul>
        ) : <p className="muted">Check in at a meetup to earn your first badge.</p>}

        <h3>Going to</h3>
        {going.length ? going.map((e) => (
          <Link key={e._id} href={`/events/${e._id}`} className="card"><b>{e.title}</b><span>{e.city} · {formatWhen(e.startsAt)}</span></Link>
        )) : <p className="muted">No RSVPs yet. <Link href="/">Find a meetup</Link>.</p>}

        <h3>Attended ({checkIns.length})</h3>
        {checkIns.length ? checkIns.map((c) => c.event && (
          <Link key={c._id} href={`/events/${c.event._id}`} className="card">
            <b>{c.event.title}</b>
            <span>{c.event.city} · {formatWhen(c.event.startsAt)} · +{c.event.points} pts{c.faceVerified ? ' · face verified' : ''}</span>
          </Link>
        )) : <p className="muted">Nothing yet. Scan the host’s QR at your next meetup to verify attendance.</p>}
      </section>
    </div>
  );
}
