export const HOUSES = ['Saranda', 'Gir', 'Kanha', 'Bandipur', 'Corbett', 'Namdapha', 'Pichavaram', 'Wayanad', 'Kaziranga'];
// Students whose house isn't allotted yet can still join; they don't count towards any house leaderboard
export const NO_HOUSE = 'Not allotted';
export const HOUSE_OPTIONS = [...HOUSES, NO_HOUSE];
export const ROLES = ['member', 'coordinator', 'admin'];
export const EVENT_KINDS = ['meetup', 'coworking', 'joint-event'];
export const EVENT_STATUSES = ['proposed', 'approved', 'rejected', 'cancelled'];

// Members pick their own house until they earn points, so points can't be carried to another house.
// After that (and always for coordinators/admins, whose role is tied to a house) a house admin moves them.
export const canChangeOwnHouse = (user) => user.role === 'member' && !user.points;

// "Coding Club, Music Society" → ['Coding Club', 'Music Society'] (max 5, trimmed, de-duplicated)
export const parsePartners = (value) => {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(list.map((s) => String(s).trim().slice(0, 60)).filter(Boolean))].slice(0, 5);
};
