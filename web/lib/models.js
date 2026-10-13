import mongoose from 'mongoose';
import { HOUSES, ROLES, EVENT_KINDS } from './houses.js';

// Optional GeoJSON point: left unset (not empty) until a location is known, since 2dsphere rejects empty points
const pointSchema = new mongoose.Schema(
  { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: undefined } },
  { _id: false },
);
const point = { type: pointSchema, default: undefined };
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  email: String,
  house: { type: String, enum: HOUSES, default: 'Saranda' },
  role: { type: String, enum: ROLES, default: 'member' },
  city: String,
  // City-level location only, never exact coordinates, for privacy
  location: point,
  points: { type: Number, default: 0 },
});
userSchema.index({ location: '2dsphere' });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  kind: { type: String, enum: EVENT_KINDS, default: 'meetup' },
  hostHouses: [{ type: String, enum: HOUSES }],
  proposedBy: { type: ObjectId, ref: 'User' },
  status: { type: String, enum: ['proposed', 'approved', 'rejected'], default: 'proposed' },
  approvals: [{ house: String, by: { type: ObjectId, ref: 'User' }, at: Date }],
  city: String,
  venue: String,
  location: point,
  startsAt: Date,
  endsAt: Date,
  points: { type: Number, default: 10 },
  requireFace: { type: Boolean, default: false },
  rsvps: [{ type: ObjectId, ref: 'User' }],
}, { timestamps: true });
eventSchema.index({ location: '2dsphere' });

const checkInSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  distanceM: Number,
  faceVerified: { type: Boolean, default: false },
  // ~5 KB JPEG thumbnail for host audit; purged after 30 days (see purgeOldSelfies)
  selfie: { type: String, select: false },
  revoked: { type: Boolean, default: false },
}, { timestamps: true });
checkInSchema.index({ event: 1, user: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export const CheckIn = mongoose.models.CheckIn || mongoose.model('CheckIn', checkInSchema);

export const SELFIE_RETENTION_DAYS = 30;
export const purgeOldSelfies = () => CheckIn.updateMany(
  { selfie: { $exists: true }, createdAt: { $lt: new Date(Date.now() - SELFIE_RETENTION_DAYS * 864e5) } },
  { $unset: { selfie: 1 } },
);
