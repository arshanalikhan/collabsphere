import { connectDB } from '@/lib/db';
import { Event, User, CheckIn } from '@/lib/models';
import { handle, requireUser, HttpError } from '@/lib/auth';
import { approveEvent, rejectEvent } from '@/lib/events';
import { makeQrToken } from '@/lib/qr';
import { icsFor } from '@/lib/calendar';
import { formatWhen } from '@/lib/time';

const csvCell = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
const fileName = (title, ext) => `${title.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'}.${ext}`;

async function hostEvent(id, user) {
  const event = await Event.findById(id);
  if (!event) throw new HttpError(404, 'Not found');
  if (!event.hostHouses.includes(user.house)) throw new HttpError(403, 'Not a host house');
  return event;
}

// GET /api/events/:id/qr          rotating check-in token for host screens
// GET /api/events/:id/ics         public calendar file for a live event
// GET /api/events/:id/attendance  RSVP + check-in CSV for host-house admins
export const GET = handle(async (req, { params }) => {
  const { id, action } = await params;

  if (action === 'ics') {
    await connectDB();
    const event = await Event.findOne({ _id: id, status: 'approved' });
    if (!event) throw new HttpError(404, 'Not found');
    const url = `${new URL(req.url).origin}/events/${id}`;
    return new Response(icsFor(event, url), {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName(event.title, 'ics')}"` },
    });
  }

  if (action === 'qr') {
    const user = await requireUser('coordinator', 'admin');
    await hostEvent(id, user);
    return Response.json({ token: makeQrToken(id) });
  }

  if (action === 'attendance') {
    const admin = await requireUser('admin');
    const event = await hostEvent(id, admin);
    const [rsvpUsers, checkIns] = await Promise.all([
      User.find({ _id: { $in: event.rsvps } }).select('name house city'),
      CheckIn.find({ event: event._id }).populate('user', 'name house city'),
    ]);
    const people = new Map(rsvpUsers.map((u) => [String(u._id), { user: u, rsvp: true }]));
    for (const c of checkIns) {
      if (!c.user) continue;
      const row = people.get(String(c.user._id)) || { user: c.user, rsvp: false };
      people.set(String(c.user._id), { ...row, checkIn: c });
    }
    const rows = [['name', 'house', 'city', 'rsvp', 'checked_in', 'checked_in_at_ist', 'distance_m', 'face_verified']];
    for (const { user, rsvp, checkIn: c } of people.values()) {
      rows.push([user.name, user.house, user.city, rsvp ? 'yes' : 'no', c ? (c.revoked ? 'revoked' : 'yes') : 'no',
        c ? formatWhen(c.createdAt) : '', c ? Math.round(c.distanceM) : '', c?.faceVerified ? 'yes' : 'no']);
    }
    return new Response(toCsv(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName(event.title, 'csv')}"` },
    });
  }

  throw new HttpError(404, 'Not found');
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
