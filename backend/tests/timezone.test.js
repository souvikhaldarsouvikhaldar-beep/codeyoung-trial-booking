process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const tzl = require('../src/domain/timezone');

const HOUR = 3600000;

test('US spring-forward day is 23 hours, fall-back day is 25 hours', () => {
  const spring = tzl.localDayRange('2026-03-08', 'America/New_York');
  const fall = tzl.localDayRange('2026-11-01', 'America/New_York');
  assert.equal((spring.endMs - spring.startMs) / HOUR, 23);
  assert.equal((fall.endMs - fall.startMs) / HOUR, 25);
});

test('UK and US change clocks on different dates (the awkward March/October gap)', () => {
  const uk = tzl.localDayRange('2026-03-29', 'Europe/London');
  assert.equal((uk.endMs - uk.startMs) / HOUR, 23);
  // On 2026-03-20 the US is already on EDT but the UK is still on GMT: only a 4h gap, not 5h.
  const t = Date.UTC(2026, 2, 20, 12, 0);
  const diff = tzl.getOffsetMs(t, 'Europe/London') - tzl.getOffsetMs(t, 'America/New_York');
  assert.equal(diff / HOUR, 4);
});

test('same local time maps to different UTC instants either side of DST', () => {
  assert.equal(tzl.zonedToUtcMs(2026, 10, 14, 9, 0, 'America/New_York'), Date.UTC(2026, 9, 14, 13, 0));
  assert.equal(tzl.zonedToUtcMs(2026, 11, 3, 9, 0, 'America/New_York'), Date.UTC(2026, 10, 3, 14, 0));
});

test('India has no DST and is UTC+05:30', () => {
  const summer = tzl.formatInstant(Date.UTC(2026, 6, 1, 12, 0), 'Asia/Kolkata');
  const winter = tzl.formatInstant(Date.UTC(2026, 0, 1, 12, 0), 'Asia/Kolkata');
  assert.equal(summer.offset, 'UTC+05:30');
  assert.equal(winter.offset, 'UTC+05:30');
  assert.equal(summer.abbr, 'IST');
  assert.equal(summer.time, '5:30 PM');
});

test('abbreviations switch with DST', () => {
  assert.equal(tzl.tzAbbreviation(Date.UTC(2026, 6, 1), 'America/New_York'), 'EDT');
  assert.equal(tzl.tzAbbreviation(Date.UTC(2026, 0, 1), 'America/New_York'), 'EST');
  assert.equal(tzl.tzAbbreviation(Date.UTC(2026, 6, 1), 'Europe/London'), 'BST');
});

test('isValidTimeZone', () => {
  assert.equal(tzl.isValidTimeZone('Europe/London'), true);
  assert.equal(tzl.isValidTimeZone('Mars/Olympus'), false);
  assert.equal(tzl.isValidTimeZone(''), false);
});
