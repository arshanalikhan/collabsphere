// All event times are shown and entered in IST, whatever timezone the server (UTC on Vercel) or browser runs in
export const TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 6e4;

export const formatWhen = (d) => new Date(d).toLocaleString('en-IN', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

// Date → "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local">
export const toISTInput = (d) => (d ? new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().slice(0, 16) : '');

// "YYYY-MM-DDTHH:mm" from a datetime-local input is IST wall time; strings with an explicit zone are kept as is
export const parseIST = (s) => {
  if (!s) return undefined;
  const str = String(s);
  return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(str) ? str : `${str}+05:30`);
};
