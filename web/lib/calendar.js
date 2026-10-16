// Calendar links for an event: Google Calendar template URL and a standard .ics file
const DEFAULT_LENGTH_MS = 2 * 36e5;
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const range = (e) => [e.startsAt, e.endsAt || new Date(new Date(e.startsAt).getTime() + DEFAULT_LENGTH_MS)];
const where = (e) => [e.venue, e.city].filter(Boolean).join(', ');
const details = (e, url) => [e.description, `Hosted by ${e.hostHouses.join(' × ')}`, url].filter(Boolean).join('\n\n');

export function googleCalendarUrl(e, url) {
  const [start, end] = range(e);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${stamp(start)}/${stamp(end)}`, details: details(e, url), location: where(e) });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsFor(e, url) {
  const [start, end] = range(e);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CollabSphere//Saranda House//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e._id}@collabsphere`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(where(e))}`,
    `DESCRIPTION:${esc(details(e, url))}`,
    `URL:${url}`,
    ...(e.location?.coordinates ? [`GEO:${e.location.coordinates[1]};${e.location.coordinates[0]}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
