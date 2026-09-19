import { config } from '../config.js';
import { getStation } from '../data/stations.js';
import { cacheRemember } from '../cache/cache.js';
import * as imd from '../imd/client.js';

export async function getRadar(loc) {
  const city = getStation(loc);
  return cacheRemember(['radar', city.id], async () => {
    if (config.enableLiveImd) {
      const res = await imd.getRadarInfo(city.id);
      if (res.ok) {
        return {
          ok: true,
          live: true,
          data: {
            ...res.value,
            source: 'imd',
            sourceLabel: 'LIVE',
            provider: 'India Meteorological Department - Doppler Weather Radar',
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }
    return {
      ok: false,
      live: false,
      data: null,
      note: 'IMD radar products unavailable - open the official IMD radar pages directly. No radar imagery is fabricated.'
    };
  }, config.cacheTtlSeconds.radar);
}

export async function getSat() {
  return cacheRemember(['sat'], async () => {
    if (config.enableLiveImd) {
      const res = await imd.getSatelliteInfo();
      if (res.ok) {
        return {
          ok: true,
          live: true,
          data: {
            ...res.value,
            source: 'imd',
            sourceLabel: 'LIVE',
            provider: 'India Meteorological Department - INSAT-3D/3DR',
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }
    return {
      ok: false,
      live: false,
      data: null,
      note: 'IMD satellite imagery unavailable - open the official IMD satellite pages directly. No imagery is fabricated.'
    };
  }, config.cacheTtlSeconds.satellite);
}