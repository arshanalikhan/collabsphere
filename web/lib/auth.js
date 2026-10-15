import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { connectDB } from './db.js';
import { User } from './models.js';

export const DEV_USERS = ['member-1', 'member-2', 'lucknow-coord', 'saranda-admin', 'kaziranga-admin'];
export const devAuthEnabled = () => process.env.DEV_AUTH === 'true';

// Resolves the signed-in user: in demo mode a devUser cookie can impersonate the seeded demo users (never real accounts),
// otherwise the Google session.
export async function getCurrentUser() {
  const cookieUid = devAuthEnabled() ? (await cookies()).get('devUser')?.value : null;
  const devUid = DEV_USERS.includes(cookieUid) ? cookieUid : null;
  const uid = devUid || (await auth())?.user?.uid;
  if (!uid) return null;
  await connectDB();
  return User.findOne({ uid });
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function requireUser(...roles) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'Please sign in');
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'Forbidden');
  return user;
}

// Wraps a route handler so thrown HttpErrors become JSON responses
export const handle = (fn) => async (req, ctx) => {
  try {
    return await fn(req, ctx);
  } catch (err) {
    if (err.status) return Response.json({ error: err.message }, { status: err.status });
    if (err.code === 11000) return Response.json({ error: 'Already exists' }, { status: 409 });
    // Malformed ids (CastError) and unparseable JSON bodies are client mistakes, not server errors
    if (err.name === 'CastError') return Response.json({ error: 'Not found' }, { status: 404 });
    if (err instanceof SyntaxError) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    if (err.name === 'ValidationError') return Response.json({ error: 'Invalid data' }, { status: 400 });
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
};

export const toJSON = (doc) => JSON.parse(JSON.stringify(doc));
