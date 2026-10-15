import mongoose from 'mongoose';
import { User, Event, CheckIn } from '../lib/models.js';

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { dbName: process.env.MONGO_DB || 'collabsphere' });
await Promise.all([User.deleteMany({}), Event.deleteMany({}), CheckIn.deleteMany({})]);

const pt = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });
const [admin, coord, kazAdmin] = await User.create([
  { uid: 'saranda-admin', name: 'Saranda Admin', house: 'Saranda', role: 'admin', city: 'Chennai', location: pt(80.27, 13.08), points: 40 },
  { uid: 'lucknow-coord', name: 'Lucknow Coordinator', house: 'Saranda', role: 'coordinator', city: 'Lucknow', location: pt(80.95, 26.85), points: 30 },
  { uid: 'kaziranga-admin', name: 'Kaziranga Admin', house: 'Kaziranga', role: 'admin', city: 'Delhi', location: pt(77.21, 28.61), points: 25 },
  { uid: 'member-1', name: 'Demo Member', house: 'Saranda', city: 'Lucknow', location: pt(80.94, 26.84) },
  { uid: 'member-2', name: 'Peer Student', house: 'Kaziranga', city: 'Kanpur', location: pt(80.33, 26.45), points: 10 },
  { uid: 'gir-1', name: 'Gir Member', house: 'Gir', city: 'Ahmedabad', location: pt(72.58, 23.02), points: 35 },
  { uid: 'kanha-1', name: 'Kanha Member', house: 'Kanha', city: 'Bhopal', location: pt(77.41, 23.26), points: 20 },
  { uid: 'corbett-1', name: 'Corbett Member', house: 'Corbett', city: 'Dehradun', location: pt(78.03, 30.32), points: 15 },
  { uid: 'wayanad-1', name: 'Wayanad Member', house: 'Wayanad', city: 'Kochi', location: pt(76.27, 9.93), points: 18 },
]);

// Demo events at sensible IST wall-clock times, relative to the day the seed runs
const IST = 330 * 6e4;
const at = (days, hour) => {
  const d = new Date(Date.now() + IST);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return new Date(d.getTime() - IST);
};
const sunday = (7 - new Date(Date.now() + IST).getUTCDay()) % 7 || 7;
await Event.create([
  { title: 'Lucknow Co-working Sunday', kind: 'coworking', hostHouses: ['Saranda'], proposedBy: coord._id, status: 'approved',
    approvals: [{ house: 'Saranda', by: admin._id, at: new Date() }], city: 'Lucknow', venue: 'Hazratganj Cafe',
    location: pt(80.946, 26.85), startsAt: at(sunday, 10), endsAt: at(sunday, 13), points: 10, requireFace: true,
    description: 'Bring your laptop, finish your weekly assignments together.' },
  { title: 'Chennai Campus Meetup', kind: 'meetup', hostHouses: ['Saranda', 'Kaziranga'], proposedBy: admin._id, status: 'approved',
    approvals: [{ house: 'Saranda', by: admin._id, at: new Date() }, { house: 'Kaziranga', by: kazAdmin._id, at: new Date() }],
    city: 'Chennai', venue: 'IIT Madras Research Park', location: pt(80.243, 12.99), startsAt: at(4, 17), points: 20 },
  { title: 'UP Regional Meetup x Kaziranga', kind: 'joint-event', hostHouses: ['Saranda', 'Kaziranga'], proposedBy: coord._id,
    status: 'proposed', city: 'Kanpur', venue: 'Phoolbagh', location: pt(80.33, 26.47), startsAt: at(6, 16), points: 25 },
]);

console.log('Seeded.');
await mongoose.disconnect();
