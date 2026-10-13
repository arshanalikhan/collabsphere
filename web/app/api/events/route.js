import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models';
import { handle, requireUser } from '@/lib/auth';

export const GET = handle(async (req) => {
  await connectDB();
  const status = req.nextUrl.searchParams.get('status') || 'approved';
  return Response.json(await Event.find({ status }).sort({ startsAt: 1 }));
});

export const POST = handle(async (req) => {
  const user = await requireUser('coordinator', 'admin');
  const { lng, lat, hostHouses = [], title, description, kind, city, venue, startsAt, endsAt, points, requireFace } = await req.json();
  const event = await Event.create({
    title, description, kind, city, venue, startsAt, endsAt, points,
    requireFace: requireFace === true || requireFace === 'on',
    hostHouses: [...new Set([user.house, ...hostHouses])],
    proposedBy: user._id,
    location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
  });
  return Response.json(event, { status: 201 });
});
