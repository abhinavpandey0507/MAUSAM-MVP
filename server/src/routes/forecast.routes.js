import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getStation } from '../data/stations.js';
import { getWeather } from '../services/weatherService.js';

export const forecastRouter = Router();

/** GET /api/forecast?location=new-delhi&demo=1 */
forecastRouter.get(
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
        location: data.location,
        forecast: data.forecast,
        hourly: data.hourly,
        meta: data.meta,
        current: data.current
      }
    });
  })
);