const { formatInstant } = require('../domain/timezone');

/**
 * Dummy "email" sender: prints the email to the server console and keeps it in the outbox.
 * Both emails show the time in the RECIPIENT's own time zone (parent: their zone, mentor: IST).
 * To go live, implement the same sendBookingConfirmations() with nodemailer/SES/SendGrid.
 */
class ConsoleNotifier {
  constructor(store) {
    this.store = store;
  }

  sendBookingConfirmations({ booking, mentor }) {
    const startMs = Date.parse(booking.startUtc);
    const parentWhen = formatInstant(startMs, booking.parentTimezone);
    const mentorWhen = formatInstant(startMs, mentor.timezone);

    const emails = [
      {
        to: booking.parentEmail,
        subject: `Your Codeyoung trial class is confirmed - ${parentWhen.date}, ${parentWhen.time} ${parentWhen.abbr}`,
        body: [
          `Hi ${booking.parentName},`,
          '',
          `Your free trial class is booked for ${parentWhen.text}.`,
          `Your mentor: ${mentor.name}`,
          `Join link: ${booking.meetingLink}`,
          '',
          `All times are in your local time zone (${booking.parentTimezone}).`,
        ].join('\n'),
      },
      {
        to: mentor.email,
        subject: `New trial class - ${mentorWhen.date}, ${mentorWhen.time} ${mentorWhen.abbr}`,
        body: [
          `Hi ${mentor.name},`,
          '',
          `You have a trial class with ${booking.parentName} on ${mentorWhen.text}.`,
          `Join link: ${booking.meetingLink}`,
          '',
          `All times are in your local time zone (${mentor.timezone}).`,
        ].join('\n'),
      },
    ];

    for (const email of emails) {
      this.store.addEmail({ ...email, bookingId: booking.id, sentAt: new Date().toISOString() });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`\n--- EMAIL to ${email.to} ---\nSubject: ${email.subject}\n\n${email.body}\n`);
      }
    }
  }
}

module.exports = { ConsoleNotifier };
