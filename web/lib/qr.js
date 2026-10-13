import crypto from 'node:crypto';

const WINDOW_MS = 30_000;
const sign = (eventId, slot) =>
  crypto.createHmac('sha256', process.env.QR_SECRET).update(`${eventId}:${slot}`).digest('base64url').slice(0, 16);

export const makeQrToken = (eventId) => {
  const slot = Math.floor(Date.now() / WINDOW_MS);
  return `${eventId}.${slot}.${sign(eventId, slot)}`;
};

// Accepts the current or previous slot so a scan at the boundary still works
export const verifyQrToken = (token) => {
  const [eventId, slotStr, sig] = String(token).split('.');
  const slot = Number(slotStr);
  const now = Math.floor(Date.now() / WINDOW_MS);
  if (!(slot === now || slot === now - 1)) return null;
  const expected = sign(eventId, slot);
  if (sig?.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return eventId;
};

export const haversine = ([lng1, lat1], [lng2, lat2]) => {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
};
