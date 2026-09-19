import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getStation } from '../data/stations.js';
import { getWeather } from '../services/weatherService.js';
import { topWarning } from '../personalization/engine.js';

export const alertsRouter = Router();

/** GET /api/alerts?location=new-delhi&demo=1 */
alertsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const demo = req.query.demo === '1';
    const city = getStation(req.query.location || 'new-delhi');
    const data = await getWeather(city.id, { demo });
    res.json({
      ok: true,
      demo,
      location: city.id,
      data: {
        warnings: data.warnings,
        topWarning: topWarning(data.warnings),
        nowcast: data.nowcast,
        source: 'India Meteorological Department',
        meta: data.meta
      }
    });
  })
);