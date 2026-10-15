'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { User, Event, CheckIn } from '@/lib/models';
import { requireUser, DEV_USERS, devAuthEnabled } from '@/lib/auth';
import { signOut } from '@/auth';
import { approveEvent, rejectEvent } from '@/lib/events';
import { HOUSES, ROLES } from '@/lib/houses';
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

export async function adminApprove(id) {
  const admin = await requireUser('admin');
  await approveEvent(id, admin);
  revalidatePath('/admin');
}

export async function adminReject(id) {
  const admin = await requireUser('admin');
  await rejectEvent(id, admin);
  revalidatePath('/admin');
}

export async function adminUpdateEvent(formData) {
  const admin = await requireUser('admin');
  const event = await Event.findById(formData.get('id'));
  if (!event?.hostHouses.includes(admin.house)) return;
  event.title = formData.get('title');
  event.venue = formData.get('venue');
  event.points = Number(formData.get('points'));
  event.startsAt = parseIST(formData.get('startsAt'));
  event.requireFace = formData.get('requireFace') === 'on';
  await event.save();
  revalidatePath('/admin');
}

export async function adminUpdateUser(formData) {
  const admin = await requireUser('admin');
  const target = await User.findById(formData.get('id'));
  // Admins manage members of their own house only
  if (!target || target.house !== admin.house) return;
  const role = formData.get('role');
  if (ROLES.includes(role) && !target._id.equals(admin._id)) target.role = role;
  const delta = Number(formData.get('pointsDelta') || 0);
  if (delta) target.points += delta;
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
  if (HOUSES.includes(house)) user.house = house;
  user.name = formData.get('name');
  user.city = formData.get('city');
  const lat = parseFloat(formData.get('lat')), lng = parseFloat(formData.get('lng'));
  // Round to ~1 km so only an approximate area is ever stored
  if (!isNaN(lat) && !isNaN(lng)) user.location = { type: 'Point', coordinates: [+lng.toFixed(2), +lat.toFixed(2)] };
  await user.save();
  revalidatePath('/', 'layout');
}
