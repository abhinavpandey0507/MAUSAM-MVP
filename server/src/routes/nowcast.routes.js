import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getStation } from '../data/stations.js';
import { getWeather } from '../services/weatherService.js';

export const nowcastRouter = Router();

/** GET /api/nowcast?location=new-delhi&demo=1 */
nowcastRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const demo = req.query.demo === '1';
    const city = getStation(req.query.location || 'new-delhi');
    const data = await getWeather(city.id, { demo });
    res.json({ ok: true, demo, location: city.id, data: { nowcast: data.nowcast, meta: data.meta } });
  })
);