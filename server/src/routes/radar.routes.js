import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getStation } from '../data/stations.js';
import { getRadar } from '../services/mediaService.js';

export const radarRouter = Router();

/** GET /api/radar?location=new-delhi */
radarRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const city = getStation(req.query.location || 'new-delhi');
    const result = await getRadar(city.id);
    res.json({
      ok: result.ok,
      live: result.live,
      location: city.id,
      data: result.data,
      note: result.note
    });
  })
);