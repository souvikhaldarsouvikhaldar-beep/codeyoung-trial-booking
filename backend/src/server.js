const config = require('./config');
const mentors = require('./mentors');
const { Store } = require('./repositories/store');
const { ConsoleNotifier } = require('./notifications/notifier');
const { BookingService } = require('./services/bookingService');
const { createApp } = require('./app');

const store = new Store(config.dbFile);
const service = new BookingService({ store, mentors, notifier: new ConsoleNotifier(store) });

createApp(service).listen(config.port, () => {
  console.log(`Trial booking API running on http://localhost:${config.port}`);
});
