const fs = require('fs');
const path = require('path');

/**
 * Tiny persistence layer. Pass a file path to persist to JSON, or null for in-memory (tests).
 * The BookingService only talks to this interface, so swapping in Postgres/SQLite later
 * means writing one new class, not touching business logic.
 */
class Store {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.data = { bookings: [], outbox: [] };
    if (filePath && fs.existsSync(filePath)) {
      try {
        this.data = { bookings: [], outbox: [], ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
      } catch {
        console.warn(`Could not read ${filePath}; starting with an empty database.`);
      }
    }
  }

  getBookings() {
    return this.data.bookings;
  }

  addBooking(booking) {
    this.data.bookings.push(booking);
    this.#save();
    return booking;
  }

  addEmail(email) {
    this.data.outbox.push(email);
    this.#save();
  }

  getOutbox() {
    return this.data.outbox;
  }

  #save() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.filePath); // atomic replace, so a crash can't corrupt the file
  }
}

module.exports = { Store };
