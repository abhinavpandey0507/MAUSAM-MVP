import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { STATIONS as LOCATIONS } from '../data/stations.js';
import { getWeather } from '../services/weatherService.js';
import { personalize, PERSONAS } from '../personalization/engine.js';
import { liveStatus } from '../imd/client.js';
import { cacheStats } from '../cache/cache.js';

export const metaRouter = Router();

/** GET /api/locations */
metaRouter.get('/locations', (_req, res) => {
  res.json({
    ok: true,
    data: LOCATIONS.map((s) => ({ id: s.id, name: s.name, state: s.state, lat: s.lat, lon: s.lon }))
  });
});

/** GET /api/status - live source capability + cache stats (used by /demo tab). */
metaRouter.get('/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'MAUSAM SIH26076',
    team: 'THE_UNSCRIPTED',
    live: liveStatus(),
    cache: cacheStats,
    time: new Date().toISOString()
  });
});

/** POST /api/personalize - the server-side engine mirror (rule table based). */
metaRouter.post(
  '/personalize',
  asyncHandler(async (req, res) => {
    const { location = 'new-delhi', persona = 'general', demo = false, severeSim = false, personas = null, requirements = [] } = req.body || {};
    const weather = await getWeather(location, { demo: Boolean(demo) });

    // Mirror of the client-side demo severe-warning override (never fabricated as live).
    if (demo && severeSim) {
      const now = new Date();
      weather.warnings = [
        ...(weather.warnings || []),
        {
          severity: 'alert',
          event: 'Heavy rain with strong winds (DEMO scenario)',
          area: weather.location,
          detail:
            'Simulated for demonstration. This is NOT an official IMD warning - it demonstrates the safety override rule of the personalization engine.',
          validFrom: now.toISOString(),
          validUntil: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
          source: 'demo-simulation'
        }
      ];
    }

    const result = personalize(
      weather,
      persona,
      personas && personas.length ? { personas, requirements, warnings: weather.warnings } : null
    );
    res.json({ ok: true, result, dataSource: weather.meta.dataSourceLabel });
  })
);

/** GET /api/personas - definition list for the persona picker. */
metaRouter.get('/personas', (_req, res) => {
  res.json({ ok: true, data: Object.values(PERSONAS).map((p) => ({ id: p.id, label: p.label, emoji: p.emoji, description: p.description })) });
});

/** GET /api/health */
metaRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mausam-server', up: true, time: new Date().toISOString() });
});