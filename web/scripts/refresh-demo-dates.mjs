// Moves the seeded demo events to realistic upcoming IST times without touching users, RSVPs or check-ins.
// Dry run by default:  npm run demo:refresh
// Apply:               npm run demo:refresh -- --apply
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');
const IST = 330 * 6e4;
// Wall-clock time in IST, `days` from today
const at = (days, hour) => {
  const d = new Date(Date.now() + IST);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return new Date(d.getTime() - IST);
};
const sunday = (7 - new Date(Date.now() + IST).getUTCDay()) % 7 || 7;
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '-');

// Same schedule as scripts/seed.mjs
const plan = {
  'Lucknow Co-working Sunday': { startsAt: at(sunday, 10), endsAt: at(sunday, 13) },
  'Chennai Campus Meetup': { startsAt: at(4, 17) },
  'UP Regional Meetup x Kaziranga': { startsAt: at(6, 16) },
};

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { dbName: process.env.MONGO_DB || 'collabsphere' });
const events = mongoose.connection.collection('events');
for (const [title, set] of Object.entries(plan)) {
  const cur = await events.findOne({ title });
  if (!cur) { console.log(`not found: ${title}`); continue; }
  console.log(`${title} [${cur.status}]: ${fmt(cur.startsAt)} -> ${fmt(set.startsAt)}`);
  if (apply) await events.updateOne({ _id: cur._id }, { $set: set });
}
console.log(apply ? 'Updated.' : 'Dry run. Re-run with --apply to update.');
await mongoose.disconnect();
