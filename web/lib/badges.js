// Recognition for showing up, computed from a member's verified (non-revoked) check-ins
export function badgesFor({ checkIns, organised }) {
  const events = checkIns.map((c) => c.event).filter(Boolean);
  const cities = new Set(events.map((e) => e.city?.trim().toLowerCase()).filter(Boolean));
  return [
    events.length >= 1 && { icon: '🎟️', name: 'First check-in', why: 'Showed up to a meetup' },
    events.length >= 3 && { icon: '🔁', name: 'Regular', why: '3+ verified check-ins' },
    cities.size >= 2 && { icon: '🧭', name: 'Explorer', why: 'Met peers in 2+ cities' },
    events.some((e) => e.hostHouses?.length > 1) && { icon: '🤝', name: 'Bridge builder', why: 'Joined a cross-house event' },
    organised >= 1 && { icon: '📣', name: 'Organiser', why: 'Proposed an event that went live' },
  ].filter(Boolean);
}
