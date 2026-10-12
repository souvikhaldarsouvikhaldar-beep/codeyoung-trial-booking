const fs = require('fs');
const path = require('path');
const express = require('express');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

function createApp(service) {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes(service));
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route.' } }));

  // In production (`npm start` from the repo root) the built React app is served by the same server.
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
