const express = require('express');

module.exports = function apiRoutes(service) {
  const router = express.Router();

  router.get('/health', (req, res) => res.json({ ok: true }));

  router.get('/availability', (req, res) => {
    res.json(service.getAvailability(req.query.tz));
  });

  router.get('/slots', (req, res) => {
    res.json(service.getSlots(req.query.date, req.query.tz));
  });

  router.post('/bookings', (req, res) => {
    res.status(201).json(service.createBooking(req.body || {}));
  });

  return router;
};
