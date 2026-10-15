import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models';
import { getCurrentUser, toJSON } from '@/lib/auth';
import EventMap from '@/components/EventMapLoader';
import NearbyPeers from '@/components/NearbyPeers';
import { formatWhen } from '@/lib/time';

export const dynamic = 'force-dynamic';

const KIND_ICON = { meetup: '☕', coworking: '💻', 'joint-event': '🤝' };

export default async function Home() {
  const me = await getCurrentUser();
  await connectDB();
  const events = toJSON(await Event.find({ status: 'approved', startsAt: { $gte: new Date(Date.now() - 864e5) } }).sort({ startsAt: 1 }));
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
        <EventMap events={events} />
        <aside>
          <h2>Upcoming</h2>
          {!events.length && <p className="muted">No upcoming events yet.</p>}
          {events.map((e) => (
            <Link key={e._id} href={`/events/${e._id}`} className="card">
              <b>{KIND_ICON[e.kind]} {e.title}</b>
              <span>{e.city} · {e.hostHouses.join(' × ')} · {e.points} pts</span>
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
