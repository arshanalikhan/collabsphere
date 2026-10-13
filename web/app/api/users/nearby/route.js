import { User } from '@/lib/models';
import { handle, requireUser } from '@/lib/auth';

// Peers within radius km, exposing city only (no coordinates)
export const GET = handle(async (req) => {
  const me = await requireUser();
  const [lng, lat] = me.location?.coordinates || [];
  if (lng == null) return Response.json([]);
  const km = Number(req.nextUrl.searchParams.get('km')) || 100;
  const peers = await User.find({
    _id: { $ne: me._id },
    location: { $nearSphere: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: km * 1000 } },
  }).select('name house city').limit(50);
  return Response.json(peers);
});
