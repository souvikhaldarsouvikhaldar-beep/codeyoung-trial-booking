/**
 * Seed data: 10 mentors, all in India (IST).
 * shifts are [startMinute, endMinute] from local midnight; end > 1440 means the shift runs past midnight.
 *  - Mentors 1-5: day shift   10:00 - 22:00 IST  (covers UK mornings/afternoons, US early morning)
 *  - Mentors 6-10: night shift 18:00 - 02:00 IST (covers US daytime)
 */
const IST = 'Asia/Kolkata';
const DAY = [[10 * 60, 22 * 60]];
const NIGHT = [[18 * 60, 26 * 60]];

const names = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Vikram Singh',
  'Neha Gupta', 'Arjun Reddy', 'Sneha Das', 'Karan Patel', 'Ishita Bose',
];

module.exports = names.map((name, i) => ({
  id: `m${i + 1}`,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@mentors.codeyoung.example`,
  timezone: IST,
  shifts: i < 5 ? DAY : NIGHT,
}));
