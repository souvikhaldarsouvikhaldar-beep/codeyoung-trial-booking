# Codeyoung Trial Class Booking

A web app where parents book a free 30-minute trial class. The system assigns an available mentor, and sends both sides an (dummy) email containing a class link, with times shown in each person's own time zone.

**Stack:** Node.js + Express (API) · React + Vite (frontend) · no database to install (data is saved to a JSON file).

## Run it

You need **Node.js 18 or newer** ([nodejs.org](https://nodejs.org), LTS version).

```bash
npm run install:all   # installs root, backend and frontend dependencies
npm run dev           # starts API on :4000 and the website on :5173
```

Open **http://localhost:5173**. Confirmation "emails" are printed in the terminal running `npm run dev` (and saved in `backend/data/db.json`).

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the backend tests (time zones, DST, 2-classes/day rule, double booking, emails) |
| `npm start` | Builds the React app and serves everything from one server on http://localhost:4000 |

Optional settings (environment variables): `PORT` (default 4000), `ENFORCE_ONE_TRIAL=false` (lets the same email book more than once, useful for demoing), `DB_FILE`.
To reset all bookings, stop the server and delete `backend/data/db.json`.

## How it works

1. Parent's time zone is auto-detected from the browser (they can change it).
2. They pick a day (next 14 days, with a count of open slots per day) and a time, grouped Morning/Afternoon/Evening.
3. They enter name and email. The server picks a mentor and books the class.
4. A confirmation screen and two emails (parent + mentor) show the time in **their own** time zone plus a dummy class link.

### Rules implemented

| Requirement | How |
| --- | --- |
| 10 mentors | `backend/src/mentors.js` (5 day-shift, 5 night-shift IST mentors so US and UK parents both have coverage) |
| Max 2 demo classes per mentor per day | Enforced in `getAvailableMentors()`. Counted per *working day* so an overnight shift isn't split across two calendar dates. 10 mentors x 2 = 20 classes/day, matching the "20 parents per day" figure |
| Different time zones | Everything is stored in UTC. Slots are generated for the parent's local calendar day; mentors' shifts are evaluated in IST; every message shows the recipient's local time with its abbreviation and UTC offset (e.g. `Wed, Oct 14, 9:00 AM EDT (UTC-04:00)`) |
| Daylight Saving Time | Uses the IANA time zone database via the built-in `Intl` API. Days that are 23h or 25h long are handled, as is the period when the US and UK are on different offsets. Covered by tests |
| Dummy links | `https://classroom.codeyoung.example/trial/<random>` is generated per booking |
| No mentors available | Full days are greyed out as "Fully booked"; a day with no free slots shows a clear message; if all 14 days are full a dedicated message is shown; if a slot is taken while the parent is filling the form they are sent back to a refreshed list with an explanation (HTTP 409 `SLOT_UNAVAILABLE`) |

Mentor assignment is fair: the least-loaded available mentor gets the class (ties by mentor id).

### What I deliberately did *not* build

- Login/accounts, payments, rescheduling or cancellation, an admin dashboard, and real email delivery. They aren't needed to prove the booking flow, and the notifier is a small interface (`ConsoleNotifier`) that can be swapped for a real email provider.
- A real database. `Store` is a small repository interface over a JSON file; swapping in Postgres means writing one class. Booking is a synchronous check-and-insert, so a single server can't double-book. With a database you'd use a transaction or unique constraint.
- Extra rules I chose for realism: a class must start at least 2 hours from now, can be booked up to 14 days ahead, and one email can hold one upcoming trial class at a time.

## Project structure

```
backend/
  src/
    domain/timezone.js      time zone + DST maths (pure functions)
    domain/scheduling.js    shift, availability and fair-assignment rules (pure functions)
    services/bookingService.js  validation + booking use-cases
    repositories/store.js   persistence (JSON file / in-memory)
    notifications/notifier.js   dummy emails
    routes/api.js, app.js, server.js, middleware/errorHandler.js
    config.js, mentors.js
  tests/                    node:test suites
frontend/
  src/App.jsx               page flow and state
  src/components/           TimezoneSelect, DayPicker, SlotPicker, BookingForm, Confirmation
  src/api.js                API client with friendly error messages
```

## API

- `GET /api/availability?tz=America/New_York` : next 14 days with open slot counts
- `GET /api/slots?date=2026-10-14&tz=America/New_York` : slots for that local day
- `POST /api/bookings` with `{ parentName, parentEmail, startUtc, timezone }` : books a class (201) or returns `{ error: { code, message } }`
