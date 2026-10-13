import { Event, CheckIn, User } from '@/lib/models';
import { handle, requireUser, HttpError } from '@/lib/auth';
import { verifyQrToken, haversine } from '@/lib/qr';

const MAX_DISTANCE_M = 500;
const MAX_SELFIE_BYTES = 40_000;

// Proof of presence: valid rotating QR + inside the venue geofence (+ liveness selfie when the event requires it)
export const POST = handle(async (req) => {
  const user = await requireUser();
  const { token, lng, lat, faceVerified, selfie } = await req.json();
  const eventId = verifyQrToken(token);
  if (!eventId) throw new HttpError(400, 'QR expired, please scan again');

  const event = await Event.findById(eventId);
  if (!event || event.status !== 'approved') throw new HttpError(404, 'Event not found');

  const distanceM = haversine(event.location.coordinates, [lng, lat]);
  if (!(distanceM <= MAX_DISTANCE_M)) throw new HttpError(403, `Too far from venue (${Math.round(distanceM)} m)`);

  if (await CheckIn.exists({ event: event._id, user: user._id })) throw new HttpError(409, 'Already checked in');

  const validSelfie = typeof selfie === 'string' && selfie.startsWith('data:image/jpeg;base64,') && selfie.length < MAX_SELFIE_BYTES;
  if (selfie && !validSelfie) throw new HttpError(400, 'Invalid selfie');
  // 428 tells the client to run the face check and resubmit
  if (event.requireFace && !(validSelfie && faceVerified)) throw new HttpError(428, 'Face check required');

  const checkIn = await CheckIn.create({
    event: event._id, user: user._id, distanceM,
    faceVerified: !!(validSelfie && faceVerified),
    selfie: validSelfie ? selfie : undefined,
  });
  await User.updateOne({ _id: user._id }, { $inc: { points: event.points } });
  return Response.json({ checkIn: { _id: checkIn._id }, pointsEarned: event.points }, { status: 201 });
});
