import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { Event } from '@/lib/models';
import { getCurrentUser, toJSON } from '@/lib/auth';
import RsvpButton from '@/components/RsvpButton';
import HostQr from '@/components/HostQr';

export default async function EventPage({ params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!isValidObjectId(id)) notFound();
  const event = toJSON(await Event.findById(id));
  if (!event) notFound();

  const isHost = me && me.role !== 'member' && event.hostHouses.includes(me.house);
  const going = me && event.rsvps.includes(String(me._id));
  return (
    <section className="panel accent-top" style={{ '--accent-color': 'var(--sky)' }}>
      <span className={`badge ${event.status}`}>{event.status}</span>
      <span className={`badge ${event.kind}`}>{event.kind.replace('-', ' ')}</span>
      <h1>{event.title}</h1>
      <span className="hand">hosted by {event.hostHouses.join(' × ')}</span>
      <div className="event-meta">
        <span>📍 {[event.venue, event.city].filter(Boolean).join(', ')}</span>
        <span>🗓️ {new Date(event.startsAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
        <span>⭐ {event.points} pts</span>
        <span>🙋 {event.rsvps.length} going</span>
        {event.requireFace && <span>🙂 face check</span>}
      </div>
      {event.description && <p>{event.description}</p>}
      {event.status === 'approved' && <RsvpButton id={id} going={!!going} />}
      {isHost && event.status === 'approved' && <HostQr id={id} />}
    </section>
  );
}
