'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { User, Event, CheckIn } from '@/lib/models';
import { requireUser, DEV_USERS, devAuthEnabled } from '@/lib/auth';
import { signOut } from '@/auth';
import { approveEvent, rejectEvent } from '@/lib/events';
import { HOUSE_OPTIONS, ROLES, canChangeOwnHouse, parsePartners } from '@/lib/houses';
import { parseIST } from '@/lib/time';

// Demo mode only: impersonate a seeded user, or '' to fall back to the Google session
export async function switchDevUser(uid) {
  if (!devAuthEnabled()) return;
  const jar = await cookies();
  if (DEV_USERS.includes(uid)) jar.set('devUser', uid, { path: '/', sameSite: 'lax', httpOnly: true });
  else jar.delete('devUser');
  revalidatePath('/', 'layout');
}

export async function signOutAction() {
  (await cookies()).delete('devUser');
  await signOut({ redirectTo: '/signin' });
}

// ---- Admin dashboard actions ----

// A stale or double-clicked approve/reject (event no longer pending) just refreshes the list
const ignoreHttpErrors = (err) => { if (!err.status) throw err; };

export async function adminApprove(id) {
  const admin = await requireUser('admin');
  await approveEvent(id, admin).catch(ignoreHttpErrors);
  revalidatePath('/admin');
}

export async function adminReject(id) {
  const admin = await requireUser('admin');
  await rejectEvent(id, admin).catch(ignoreHttpErrors);
  revalidatePath('/admin');
}

export async function adminUpdateEvent(formData) {
  const admin = await requireUser('admin');
  const event = await Event.findById(formData.get('id'));
  if (!event?.hostHouses.includes(admin.house)) return;
  // Blank or malformed fields keep their current value instead of failing the save
  const title = formData.get('title')?.trim();
  const startsAt = parseIST(formData.get('startsAt'));
  const points = Number(formData.get('points'));
  if (title) event.title = title;
  event.venue = formData.get('venue');
  if (formData.get('points') !== '' && !isNaN(points)) event.points = Math.min(100, Math.max(0, points));
  if (startsAt && !isNaN(startsAt)) event.startsAt = startsAt;
  event.requireFace = formData.get('requireFace') === 'on';
  if (formData.has('partners')) event.partners = parsePartners(formData.get('partners'));
  await event.save();
  revalidatePath('/admin');
}

// Cancel a live event (hidden from the map, check-ins stop) or restore it
export async function adminSetEventStatus(id, status) {
  const admin = await requireUser('admin');
  const event = await Event.findById(id);
  if (!event?.hostHouses.includes(admin.house)) return;
  const allowed = { cancelled: 'approved', approved: 'cancelled' };
  if (allowed[status] !== event.status) return;
  event.status = status;
  await event.save();
  revalidatePath('/admin');
  revalidatePath(`/events/${id}`);
}

export async function adminUpdateUser(formData) {
  const admin = await requireUser('admin');
  const target = await User.findById(formData.get('id'));
  // Admins manage members of their own house only
  if (!target || target.house !== admin.house) return;
  const isSelf = target._id.equals(admin._id);
  const role = formData.get('role');
  if (ROLES.includes(role) && !isSelf) target.role = role;
  const delta = Number(formData.get('pointsDelta') || 0);
  if (delta) target.points += delta;
  // Moving someone to another house (e.g. a wrong pick) drops any house-specific role
  const house = formData.get('house');
  if (HOUSE_OPTIONS.includes(house) && house !== target.house && !isSelf) {
    target.house = house;
    target.role = 'member';
  }
  await target.save();
  revalidatePath('/admin');
}

export async function adminRevokeCheckIn(id) {
  const admin = await requireUser('admin');
  await connectDB();
  const ci = await CheckIn.findById(id).populate('event user');
  if (!ci || ci.revoked || !ci.event.hostHouses.includes(admin.house)) return;
  ci.revoked = true;
  await ci.save();
  await User.updateOne({ _id: ci.user._id }, { $inc: { points: -ci.event.points } });
  revalidatePath('/admin');
}

export async function updateProfile(formData) {
  const user = await requireUser();
  const house = formData.get('house');
  if (canChangeOwnHouse(user) && HOUSE_OPTIONS.includes(house)) user.house = house;
  user.name = formData.get('name')?.trim() || user.name;
  user.city = formData.get('city')?.trim();
  const lat = parseFloat(formData.get('lat')), lng = parseFloat(formData.get('lng'));
  // Round to ~1 km so only an approximate area is ever stored
  if (!isNaN(lat) && !isNaN(lng)) user.location = { type: 'Point', coordinates: [+lng.toFixed(2), +lat.toFixed(2)] };
  await user.save();
  revalidatePath('/', 'layout');
}
