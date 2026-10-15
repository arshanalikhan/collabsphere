import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models';
import { getCurrentUser, toJSON } from '@/lib/auth';
import { formatWhen } from '@/lib/time';
import RsvpButton from '@/components/RsvpButton';
import HostQr from '@/components/HostQr';

async function findEvent(id) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  return toJSON(await Event.findById(id));
}

export async function generateMetadata({ params }) {
  const event = await findEvent((await params).id);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: `${event.city} · ${formatWhen(event.startsAt)} · hosted by ${event.hostHouses.join(' × ')}`,
  };
}

export default async function EventPage({ params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  const event = await findEvent(id);
  if (!event) notFound();

  const isHost = me && me.role !== 'member' && event.hostHouses.includes(me.house);
  const going = me && event.rsvps.includes(String(me._id));
  const waitingOn = event.hostHouses.filter((h) => !event.approvals.some((a) => a.house === h));
  return (
    <section className="panel accent-top" style={{ '--accent-color': 'var(--sky)' }}>
      <span className={`badge ${event.status}`}>{event.status}</span>
      <span className={`badge ${event.kind}`}>{event.kind.replace('-', ' ')}</span>
      <h1>{event.title}</h1>
      <span className="hand">hosted by {event.hostHouses.join(' × ')}</span>
      <div className="event-meta">
        <span>📍 {[event.venue, event.city].filter(Boolean).join(', ')}</span>
        <span>🗓️ {formatWhen(event.startsAt)} IST</span>
        <span>⭐ {event.points} pts</span>
        <span>🙋 {event.rsvps.length} going</span>
        {event.requireFace && <span>🙂 face check</span>}
      </div>
      {event.description && <p>{event.description}</p>}
      {event.status === 'proposed' && (
        <p className="notice">Waiting for approval from {waitingOn.join(' and ')}. It goes live on the map once every host house approves.</p>
      )}
      {event.status === 'approved' && (me
        ? <RsvpButton id={id} going={!!going} />
        : <Link href={`/signin?callbackUrl=/events/${id}`} className="btn">Sign in to RSVP</Link>)}
      {isHost && event.status === 'approved' && <HostQr id={id} />}
    </section>
  );
}
