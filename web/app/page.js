import Link from 'next/link';
import { preconnect } from 'react-dom';
import { connectDB } from '@/lib/db';
import { Event, User } from '@/lib/models';
import { getCurrentUser, toJSON } from '@/lib/auth';
import EventMap from '@/components/EventMapLoader';
import NearbyPeers from '@/components/NearbyPeers';
import { formatWhen } from '@/lib/time';

export const dynamic = 'force-dynamic';

const KIND_ICON = { meetup: '☕', coworking: '💻', 'joint-event': '🤝' };

// Where students are, one bubble per city: only counts and houses, never names or exact locations
async function peerCities() {
  const rows = await User.aggregate([
    { $match: { 'location.coordinates.1': { $exists: true }, city: { $nin: [null, ''] } } },
    { $group: {
      _id: { $toLower: { $trim: { input: '$city' } } },
      city: { $first: { $trim: { input: '$city' } } },
      lng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
      lat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
      count: { $sum: 1 },
      houses: { $addToSet: '$house' },
    } },
  ]);
  return rows.map((r) => ({ city: r.city, count: r.count, houses: r.houses.sort(), coordinates: [+r.lng.toFixed(1), +r.lat.toFixed(1)] }));
}

export default async function Home() {
  preconnect('https://tile.openstreetmap.org');
  const me = await getCurrentUser();
  await connectDB();
  const [docs, peers] = await Promise.all([
    Event.find({ status: 'approved', startsAt: { $gte: new Date(Date.now() - 864e5) } }).sort({ startsAt: 1 }),
    me ? peerCities() : [],
  ]);
  const events = toJSON(docs);
  return (
    <>
      <section className="hero">
        <div>
          <span className="hand">find your people, wherever you are</span>
          <h1>Meetups across every house</h1>
        </div>
        <div className="hero-actions">
          {me ? <Link href="/checkin" className="btn">Check in at an event</Link> : <Link href="/signin" className="btn">Sign in to join</Link>}
          {me && me.role !== 'member' && <Link href="/propose" className="btn ghost">Propose an event</Link>}
        </div>
      </section>
      <div className="grid">
        <div>
          <EventMap events={events} peerCities={peers} />
          <p className="muted map-legend">
            📍 meetups and co-working sessions{me ? ' · 🟢 students by city (counts only)' : ' · sign in to see where students are'}
          </p>
        </div>
        <aside>
          <h2>Upcoming</h2>
          {!events.length && <p className="muted">No upcoming events yet.</p>}
          {events.map((e) => (
            <Link key={e._id} href={`/events/${e._id}`} className="card">
              <b>{KIND_ICON[e.kind]} {e.title}</b>
              <span>{e.city} · {[e.hostHouses.join(' × '), ...(e.partners || [])].join(' + ')} · {e.points} pts</span>
              <span>{formatWhen(e.startsAt)}</span>
            </Link>
          ))}
          <h2>Peers near you</h2>
          {me ? <NearbyPeers /> : <p className="muted"><Link href="/signin">Sign in</Link> to see students near you.</p>}
        </aside>
      </div>
    </>
  );
}
