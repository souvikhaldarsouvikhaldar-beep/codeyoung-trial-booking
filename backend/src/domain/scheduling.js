/**
 * Pure scheduling rules: who can teach which slot. No I/O here, which keeps it easy to test.
 */
const config = require('../config');
const { getParts, localDateString, addDays, localDayRange, formatInstant } = require('./timezone');

const MIN = 60 * 1000;

function overlaps(booking, startMs, durMs) {
  const bs = Date.parse(booking.startUtc);
  return bs < startMs + durMs && startMs < bs + durMs;
}

/** Is a class starting at startMs entirely inside one of the mentor's shifts (in the mentor's zone)? */
function isOnShift(mentor, startMs, classMinutes = config.classMinutes) {
  const p = getParts(startMs, mentor.timezone);
  const t = p.hour * 60 + p.minute;
  return mentor.shifts.some(
    ([s, e]) =>
      (t >= s && t + classMinutes <= e) || // same-day part of the shift
      (t + 1440 >= s && t + 1440 + classMinutes <= e) // after-midnight part of an overnight shift
  );
}

/**
 * The mentor's "working day" a class belongs to. For overnight shifts, a class at 01:00 IST
 * belongs to the previous day's shift, so the 2-classes-a-day limit is per shift, not per clock date.
 */
function workingDay(mentor, startMs) {
  const date = localDateString(startMs, mentor.timezone);
  const p = getParts(startMs, mentor.timezone);
  const t = p.hour * 60 + p.minute;
  const spill = mentor.shifts.some(([, e]) => e > 1440 && t < e - 1440);
  return spill ? addDays(date, -1) : date;
}

/** Mentors free for this start time, each with their load that working day. */
function getAvailableMentors(mentors, bookings, startMs, cfg = config) {
  const dur = cfg.classMinutes * MIN;
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const result = [];
  for (const mentor of mentors) {
    if (!isOnShift(mentor, startMs, cfg.classMinutes)) continue;
    const mine = confirmed.filter((b) => b.mentorId === mentor.id);
    if (mine.some((b) => overlaps(b, startMs, dur))) continue;
    const day = workingDay(mentor, startMs);
    const load = mine.filter((b) => workingDay(mentor, Date.parse(b.startUtc)) === day).length;
    if (load >= cfg.maxClassesPerMentorPerDay) continue;
    result.push({ mentor, load });
  }
  return result;
}

/** Fair assignment: least-loaded mentor first, ties broken by id so results are deterministic. */
function pickMentor(candidates) {
  return [...candidates].sort(
    (a, b) => a.load - b.load || a.mentor.id.localeCompare(b.mentor.id, undefined, { numeric: true })
  )[0]?.mentor;
}

/** Bookable window check shared by slot listing and booking. */
function isWithinBookingWindow(startMs, nowMs, cfg = config) {
  return startMs >= nowMs + cfg.minLeadMinutes * MIN && startMs <= nowMs + cfg.bookingWindowDays * 86400000;
}

/**
 * Slots for one calendar day in the PARENT's zone.
 * Slots with no mentor on shift are omitted; slots where all on-shift mentors are taken come back available:false.
 */
function listSlotsForDay({ dateStr, tz, mentors, bookings, nowMs, cfg = config }) {
  const { startMs, endMs } = localDayRange(dateStr, tz);
  const grid = cfg.slotMinutes * MIN;
  const slots = [];
  for (let t = Math.ceil(startMs / grid) * grid; t < endMs; t += grid) {
    if (!isWithinBookingWindow(t, nowMs, cfg)) continue;
    if (!mentors.some((m) => isOnShift(m, t, cfg.classMinutes))) continue;
    const local = formatInstant(t, tz);
    slots.push({
      startUtc: new Date(t).toISOString(),
      localTime: local.time,
      localHour: getParts(t, tz).hour,
      abbr: local.abbr,
      available: getAvailableMentors(mentors, bookings, t, cfg).length > 0,
    });
  }
  return slots;
}

module.exports = {
  isOnShift, workingDay, getAvailableMentors, pickMentor, isWithinBookingWindow, listSlotsForDay,
};
