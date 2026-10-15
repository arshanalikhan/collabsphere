import { Event } from '@/lib/models';
import { handle, requireUser, HttpError } from '@/lib/auth';
import { approveEvent, rejectEvent } from '@/lib/events';
import { makeQrToken } from '@/lib/qr';

// GET /api/events/:id/qr — rotating check-in token for host screens
export const GET = handle(async (_req, { params }) => {
  const { id, action } = await params;
  if (action !== 'qr') throw new HttpError(404, 'Not found');
  const user = await requireUser('coordinator', 'admin');
  const event = await Event.findById(id);
  if (!event) throw new HttpError(404, 'Not found');
  if (!event.hostHouses.includes(user.house)) throw new HttpError(403, 'Not a host house');
  return Response.json({ token: makeQrToken(id) });
});

// POST /api/events/:id/{rsvp|approve|reject}
export const POST = handle(async (_req, { params }) => {
  const { id, action } = await params;
  if (action === 'rsvp') {
    const user = await requireUser();
    // Only live events take RSVPs
    const event = await Event.findOneAndUpdate({ _id: id, status: 'approved' }, { $addToSet: { rsvps: user._id } }, { new: true });
    if (!event) throw new HttpError(404, 'Event not found or not open for RSVPs');
    return Response.json(event);
  }
  const admin = await requireUser('admin');
  if (action === 'approve') return Response.json(await approveEvent(id, admin));
  if (action === 'reject') return Response.json(await rejectEvent(id, admin));
  throw new HttpError(404, 'Not found');
});
