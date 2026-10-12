/**
 * Time zone helpers built only on the built-in Intl API (no dependencies).
 * Everything is stored/computed in UTC and converted to a zone only for display or
 * for "what is this zone's calendar day". Intl uses the IANA tz database, so
 * Daylight Saving Time transitions are handled for us (23h and 25h days included).
 */
const formatterCache = new Map();

function getFormatter(tz) {
  if (!formatterCache.has(tz)) {
    formatterCache.set(
      tz,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    );
  }
  return formatterCache.get(tz);
}

function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of a UTC instant in the given zone. */
function getParts(utcMs, tz) {
  const p = {};
  for (const { type, value } of getFormatter(tz).formatToParts(new Date(utcMs))) p[type] = value;
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
  };
}

/** Offset (zone minus UTC) in ms at a given instant. Changes across DST. */
function getOffsetMs(utcMs, tz) {
  const p = getParts(utcMs, tz);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Convert a wall-clock time in `tz` to a UTC instant (ms). */
function zonedToUtcMs(year, month, day, hour, minute, tz) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - getOffsetMs(guess, tz);
  // Re-check the offset at the candidate instant: it differs if a DST change sits in between.
  return guess - getOffsetMs(first, tz);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' of the instant in the zone. */
function localDateString(utcMs, tz) {
  const p = getParts(utcMs, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** [start, end) of a local calendar day in UTC ms. On DST days this is 23 or 25 hours long. */
function localDayRange(dateStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [ny, nm, nd] = addDays(dateStr, 1).split('-').map(Number);
  return {
    startMs: zonedToUtcMs(y, m, d, 0, 0, tz),
    endMs: zonedToUtcMs(ny, nm, nd, 0, 0, tz),
  };
}

function offsetLabel(offsetMs) {
  const total = Math.round(offsetMs / 60000);
  const sign = total < 0 ? '-' : '+';
  const abs = Math.abs(total);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Short zone name like EDT, EST, BST, IST. Falls back to 'UTC+05:45' style. */
function tzAbbreviation(utcMs, tz) {
  if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IST';
  for (const locale of ['en-US', 'en-GB']) {
    const name = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(utcMs))
      .find((p) => p.type === 'timeZoneName')?.value;
    if (name && !/^(GMT|UTC)[+\-\u2212]/.test(name)) return name;
  }
  return offsetLabel(getOffsetMs(utcMs, tz));
}

/** Human-friendly local rendering of an instant, used in the API and in emails. */
function formatInstant(utcMs, tz) {
  const at = new Date(utcMs);
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(at);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(at).replace(/\u202f/g, ' ');
  const abbr = tzAbbreviation(utcMs, tz);
  const offset = offsetLabel(getOffsetMs(utcMs, tz));
  return { date, time, abbr, offset, timezone: tz, text: `${date}, ${time} ${abbr} (${offset})` };
}

function dayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

module.exports = {
  isValidTimeZone, getParts, getOffsetMs, zonedToUtcMs, localDateString,
  addDays, localDayRange, offsetLabel, tzAbbreviation, formatInstant, dayLabel,
};
