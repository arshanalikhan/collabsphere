import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models';
import { handle, requireUser, HttpError } from '@/lib/auth';
import { HOUSES, EVENT_KINDS, parsePartners } from '@/lib/houses';
import { approveEvent } from '@/lib/events';
import { parseIST } from '@/lib/time';

export const GET = handle(async (req) => {
  await connectDB();
  const status = req.nextUrl.searchParams.get('status') || 'approved';
  return Response.json(await Event.find({ status }).sort({ startsAt: 1 }));
});

export const POST = handle(async (req) => {
  const user = await requireUser('coordinator', 'admin');
  const { lng, lat, hostHouses = [], partners, title, description, kind, city, venue, startsAt, endsAt, points, requireFace } = await req.json();
  const [x, y] = [Number(lng), Number(lat)];
  const starts = parseIST(startsAt);
  if (!title?.trim() || !city?.trim()) throw new HttpError(400, 'Title and city are required');
  if (!(Math.abs(y) <= 90 && Math.abs(x) <= 180) || lat === '' || lng === '') throw new HttpError(400, 'Enter a valid latitude and longitude');
  if (!starts || isNaN(starts)) throw new HttpError(400, 'Enter a valid start time');
  if (starts < Date.now()) throw new HttpError(400, 'Start time is in the past');
  if (kind && !EVENT_KINDS.includes(kind)) throw new HttpError(400, 'Unknown event type');
  const hosts = [...new Set([user.house, ...hostHouses])].filter((h) => HOUSES.includes(h));
  if (!hosts.length) throw new HttpError(400, 'Pick at least one host house');

  const event = await Event.create({
    title: title.trim(), description, kind, city: city.trim(), venue, startsAt: starts, endsAt: parseIST(endsAt),
    points: points === undefined || points === '' ? 10 : Math.min(100, Math.max(0, Number(points) || 0)),
    requireFace: requireFace === true || requireFace === 'on',
    hostHouses: hosts,
    partners: parsePartners(partners),
    proposedBy: user._id,
    location: { type: 'Point', coordinates: [x, y] },
  });
  // An admin proposing for their own house has already approved it; co-hosts still need to approve
  return Response.json(user.role === 'admin' ? await approveEvent(event._id, user) : event, { status: 201 });
});
