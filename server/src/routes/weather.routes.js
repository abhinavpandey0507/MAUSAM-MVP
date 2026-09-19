import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getStation } from '../data/stations.js';
import { getWeather } from '../services/weatherService.js';

export const weatherRouter = Router();

/** GET /api/weather?location=new-delhi&demo=1 */
weatherRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const demo = req.query.demo === '1' || req.query.demo === 'true';
    const city = getStation(req.query.location || 'new-delhi');
    const data = await getWeather(city.id, { demo });
    res.json({ ok: true, demo, location: city.id, data });
  })
);