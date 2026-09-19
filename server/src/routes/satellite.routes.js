import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSat } from '../services/mediaService.js';

export const satelliteRouter = Router();

/** GET /api/satellite */
satelliteRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await getSat();
    res.json({ ok: result.ok, live: result.live, data: result.data, note: result.note });
  })
);