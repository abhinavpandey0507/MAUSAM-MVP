import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { weatherRouter } from './routes/weather.routes.js';
import { forecastRouter } from './routes/forecast.routes.js';
import { nowcastRouter } from './routes/nowcast.routes.js';
import { alertsRouter } from './routes/alerts.routes.js';
import { radarRouter } from './routes/radar.routes.js';
import { satelliteRouter } from './routes/satellite.routes.js';
import { metaRouter } from './routes/meta.routes.js';
import { notFound, errorHandler } from './utils/asyncHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Simple request log (dev-friendly)
app.use('/api', (req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/weather', weatherRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/nowcast', nowcastRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/radar', radarRouter);
app.use('/api/satellite', satelliteRouter);
app.use('/api', metaRouter);
app.get('/api', (_req, res) =>
  res.json({ service: 'MAUSAM - Personalized Weather Intelligence (SIH26076)', team: 'THE_UNSCRIPTED', api: true })
);

// Serve the built client when present (production single-server mode).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    const target = path.join(clientDist, 'index.html');
    if (fs.existsSync(target)) res.sendFile(target);
    else res.status(404).json(notFound(req, res));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  MAUSAM server running → http://localhost:${config.port}`);
  console.log(`  Live IMD enabled: ${config.enableLiveImd} | API key: ${config.imdApiKey ? 'configured' : 'not set (uses labeled fallback/simulated data)'}`);
  console.log('  Attribution: Weather data source - India Meteorological Department (IMD)\n');
});