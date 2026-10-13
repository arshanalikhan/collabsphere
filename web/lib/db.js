import mongoose from 'mongoose';

// Reuse one connection across hot reloads and serverless invocations
let cached = globalThis._mongoose || (globalThis._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  // MONGODB_URI is what the Vercel ↔ Atlas integration injects; MONGO_URI for local .env
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  cached.promise ||= mongoose.connect(uri, { dbName: process.env.MONGO_DB || 'collabsphere' });
  cached.conn = await cached.promise;
  return cached.conn;
}
