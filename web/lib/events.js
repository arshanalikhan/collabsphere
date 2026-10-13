import { Event } from './models.js';
import { HttpError } from './auth.js';

// Shared approval logic used by both the API route and the admin server action
export async function approveEvent(id, user) {
  const event = await Event.findById(id);
  if (!event) throw new HttpError(404, 'Not found');
  if (!event.hostHouses.includes(user.house)) throw new HttpError(403, 'Not a host house');
  if (!event.approvals.some((a) => a.house === user.house)) {
    event.approvals.push({ house: user.house, by: user._id, at: new Date() });
  }
  if (event.hostHouses.every((h) => event.approvals.some((a) => a.house === h))) event.status = 'approved';
  await event.save();
  return event;
}

export async function rejectEvent(id, user) {
  const event = await Event.findById(id);
  if (!event) throw new HttpError(404, 'Not found');
  if (!event.hostHouses.includes(user.house)) throw new HttpError(403, 'Not a host house');
  event.status = 'rejected';
  await event.save();
  return event;
}
