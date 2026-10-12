const crypto = require('crypto');
const defaultConfig = require('../config');
const { AppError } = require('../errors');
const {
  isValidTimeZone, localDateString, addDays, dayLabel, formatInstant,
} = require('../domain/timezone');
const {
  getAvailableMentors, pickMentor, isWithinBookingWindow, listSlotsForDay,
} = require('../domain/scheduling');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class BookingService {
  constructor({ store, mentors, notifier, clock = () => Date.now(), cfg = defaultConfig }) {
    this.store = store;
    this.mentors = mentors;
    this.notifier = notifier;
    this.clock = clock;
    this.cfg = cfg;
  }

  #requireTimezone(tz) {
    if (!isValidTimeZone(tz)) {
      throw new AppError(400, 'INVALID_TIMEZONE', 'Please choose a valid time zone, e.g. America/New_York.');
    }
  }

  /** Next N days (in the parent's zone) with how many bookable slots each has. Drives the day picker. */
  getAvailability(tz) {
    this.#requireTimezone(tz);
    const now = this.clock();
    const today = localDateString(now, tz);
    const bookings = this.store.getBookings();
    const days = [];
    for (let i = 0; i <= this.cfg.bookingWindowDays; i++) {
      const date = addDays(today, i);
      const slots = listSlotsForDay({ dateStr: date, tz, mentors: this.mentors, bookings, nowMs: now, cfg: this.cfg });
      days.push({
        date,
        label: dayLabel(date),
        availableSlots: slots.filter((s) => s.available).length,
      });
    }
    return { timezone: tz, days };
  }

  getSlots(dateStr, tz) {
    this.#requireTimezone(tz);
    if (!DATE_RE.test(dateStr || '') || Number.isNaN(Date.parse(dateStr))) {
      throw new AppError(400, 'INVALID_DATE', 'Date must look like YYYY-MM-DD.');
    }
    const slots = listSlotsForDay({
      dateStr, tz, mentors: this.mentors, bookings: this.store.getBookings(), nowMs: this.clock(), cfg: this.cfg,
    });
    return { timezone: tz, date: dateStr, slots };
  }

  /**
   * Book a slot. The check-and-insert below is fully synchronous, so two requests can never
   * grab the same mentor in a single Node process. With a real database you'd do this inside a
   * transaction (or rely on a unique constraint on mentor+start) to get the same guarantee.
   */
  createBooking({ parentName, parentEmail, startUtc, timezone }) {
    const name = String(parentName || '').trim();
    const email = String(parentEmail || '').trim().toLowerCase();
    if (name.length < 2) throw new AppError(400, 'VALIDATION_ERROR', 'Please enter your name.');
    if (!EMAIL_RE.test(email)) throw new AppError(400, 'VALIDATION_ERROR', 'Please enter a valid email address.');
    this.#requireTimezone(timezone);

    const startMs = Date.parse(startUtc);
    const grid = this.cfg.slotMinutes * 60000;
    if (Number.isNaN(startMs) || startMs % grid !== 0) {
      throw new AppError(400, 'INVALID_SLOT', 'That is not a valid class time.');
    }
    const now = this.clock();
    if (!isWithinBookingWindow(startMs, now, this.cfg)) {
      throw new AppError(
        400, 'OUTSIDE_WINDOW',
        `Classes can be booked at least ${this.cfg.minLeadMinutes / 60} hours ahead and up to ${this.cfg.bookingWindowDays} days in advance.`
      );
    }

    const bookings = this.store.getBookings();

    if (this.cfg.enforceOneTrialPerParent) {
      const existing = bookings.find(
        (b) => b.status === 'confirmed' && b.parentEmail === email && Date.parse(b.startUtc) > now
      );
      if (existing) {
        const when = formatInstant(Date.parse(existing.startUtc), timezone);
        throw new AppError(409, 'ALREADY_BOOKED', `You already have a trial class booked for ${when.text}.`);
      }
    }

    const mentor = pickMentor(getAvailableMentors(this.mentors, bookings, startMs, this.cfg));
    if (!mentor) {
      throw new AppError(
        409, 'SLOT_UNAVAILABLE',
        'Sorry, that time slot was just taken and no mentors are free. Please pick another time.'
      );
    }

    const booking = this.store.addBooking({
      id: crypto.randomUUID(),
      mentorId: mentor.id,
      parentName: name,
      parentEmail: email,
      parentTimezone: timezone,
      startUtc: new Date(startMs).toISOString(),
      endUtc: new Date(startMs + this.cfg.classMinutes * 60000).toISOString(),
      meetingLink: `https://classroom.codeyoung.example/trial/${crypto.randomBytes(6).toString('hex')}`,
      status: 'confirmed',
      createdAt: new Date(now).toISOString(),
    });

    try {
      this.notifier.sendBookingConfirmations({ booking, mentor });
    } catch (err) {
      // The class is booked; a failed email must not undo that. Log and carry on.
      console.error('Failed to send confirmation emails:', err);
    }

    return {
      booking: {
        id: booking.id,
        meetingLink: booking.meetingLink,
        durationMinutes: this.cfg.classMinutes,
        parent: formatInstant(startMs, timezone),
        mentor: { name: mentor.name, ...formatInstant(startMs, mentor.timezone) },
      },
    };
  }
}

module.exports = { BookingService };
