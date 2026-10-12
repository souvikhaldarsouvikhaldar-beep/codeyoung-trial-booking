const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 4000,
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json'),

  slotMinutes: 30, // slots start every 30 minutes (on the UTC half-hour grid)
  classMinutes: 30, // length of a trial class
  maxClassesPerMentorPerDay: 2, // business rule from the brief
  minLeadMinutes: 120, // can't book a class starting in under 2 hours
  bookingWindowDays: 14, // parents can book up to 14 days ahead

  // A parent gets one upcoming trial class at a time. Set ENFORCE_ONE_TRIAL=false to disable (handy for demos).
  enforceOneTrialPerParent: process.env.ENFORCE_ONE_TRIAL !== 'false',
};
