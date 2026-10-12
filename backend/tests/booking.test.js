process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const mentors = require('../src/mentors');
const { Store } = require('../src/repositories/store');
const { ConsoleNotifier } = require('../src/notifications/notifier');
const { BookingService } = require('../src/services/bookingService');
const { workingDay } = require('../src/domain/scheduling');

const NY = 'America/New_York';

function makeService(now, cfg = config) {
  const store = new Store(null);
  const service = new BookingService({ store, mentors, notifier: new ConsoleNotifier(store), clock: () => now, cfg });
  return { store, service };
}

let n = 0;
const parent = (startUtc, tz = NY) => ({
  parentName: 'Test Parent', parentEmail: `p${++n}@example.com`, startUtc, timezone: tz,
});

test('there are 10 mentors, so max 20 classes per working day', () => {
  assert.equal(mentors.length, 10);
});

test('no mentor ever exceeds 2 classes a day, and the system stops accepting when full', () => {
  const cfg = { ...config, enforceOneTrialPerParent: false };
  const { store, service } = makeService(Date.parse('2026-10-12T00:00:00Z'), cfg);

  let rejected = 0;
  for (const date of ['2026-10-14', '2026-10-15', '2026-10-16']) {
    for (const slot of service.getSlots(date, 'Asia/Kolkata').slots) {
      for (let i = 0; i < 12; i++) {
        try {
          service.createBooking(parent(slot.startUtc, 'Asia/Kolkata'));
        } catch (e) {
          assert.equal(e.code, 'SLOT_UNAVAILABLE');
          rejected++;
          break;
        }
      }
    }
  }
  assert.ok(rejected > 0, 'expected the system to run out of mentors');

  const perMentorDay = new Map();
  const perDay = new Map();
  for (const b of store.getBookings()) {
    const m = mentors.find((x) => x.id === b.mentorId);
    const day = workingDay(m, Date.parse(b.startUtc));
    perMentorDay.set(`${m.id}|${day}`, (perMentorDay.get(`${m.id}|${day}`) || 0) + 1);
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  for (const count of perMentorDay.values()) assert.ok(count <= 2);
  for (const count of perDay.values()) assert.ok(count <= 20);
});

test('the same slot cannot be double booked by one mentor', () => {
  const cfg = { ...config, enforceOneTrialPerParent: false };
  const { store, service } = makeService(Date.parse('2026-10-12T00:00:00Z'), cfg);
  const slot = service.getSlots('2026-10-14', NY).slots.find((s) => s.available);
  for (let i = 0; i < 10; i++) {
    try { service.createBooking(parent(slot.startUtc)); } catch { break; }
  }
  const ids = store.getBookings().filter((b) => b.startUtc === slot.startUtc).map((b) => b.mentorId);
  assert.equal(new Set(ids).size, ids.length);
});

test('DST: the same NY booking is EDT in October and EST in November, with the right IST time', () => {
  const summer = makeService(Date.parse('2026-10-12T00:00:00Z'));
  const s1 = summer.service.getSlots('2026-10-14', NY).slots.find((s) => s.available);
  const r1 = summer.service.createBooking(parent(s1.startUtc));
  assert.equal(r1.booking.parent.abbr, 'EDT');
  assert.equal(r1.booking.parent.offset, 'UTC-04:00');
  assert.equal(r1.booking.mentor.abbr, 'IST');

  const winter = makeService(Date.parse('2026-10-30T00:00:00Z'));
  const s2 = winter.service.getSlots('2026-11-03', NY).slots.find((s) => s.available);
  const r2 = winter.service.createBooking(parent(s2.startUtc));
  assert.equal(r2.booking.parent.abbr, 'EST');
  assert.equal(r2.booking.parent.offset, 'UTC-05:00');
});

test('confirmation emails show each person their own local time', () => {
  const { store, service } = makeService(Date.parse('2026-10-12T00:00:00Z'));
  const slot = service.getSlots('2026-10-14', NY).slots.find((s) => s.available);
  service.createBooking(parent(slot.startUtc));
  const [toParent, toMentor] = store.getOutbox();
  assert.match(toParent.body, /EDT/);
  assert.match(toMentor.body, /IST/);
  assert.match(toParent.body, /classroom\.codeyoung\.example/);
});

test('validation and window errors', () => {
  const { service } = makeService(Date.parse('2026-10-12T00:00:00Z'));
  assert.throws(() => service.createBooking({ ...parent('2026-10-14T14:00:00Z'), parentEmail: 'nope' }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => service.createBooking(parent('2026-10-14T14:00:00Z', 'Mars/Base')), { code: 'INVALID_TIMEZONE' });
  assert.throws(() => service.createBooking(parent('2026-10-12T00:30:00Z')), { code: 'OUTSIDE_WINDOW' });
  assert.throws(() => service.createBooking(parent('2026-10-14T14:07:00Z')), { code: 'INVALID_SLOT' });
});

test('one upcoming trial per parent email', () => {
  const { service } = makeService(Date.parse('2026-10-12T00:00:00Z'));
  const slots = service.getSlots('2026-10-14', NY).slots.filter((s) => s.available);
  const input = parent(slots[0].startUtc);
  service.createBooking(input);
  assert.throws(() => service.createBooking({ ...input, startUtc: slots[1].startUtc }), { code: 'ALREADY_BOOKED' });
});

test('slots on a US DST day are generated for the 23h day', () => {
  const { service } = makeService(Date.parse('2026-03-02T00:00:00Z'));
  const { slots } = service.getSlots('2026-03-08', NY);
  assert.ok(slots.length > 0);
  // 2:00-3:00 AM does not exist that day: no slot should be labelled 2:xx AM
  assert.ok(!slots.some((s) => /^2:\d\d AM$/.test(s.localTime)));
});
