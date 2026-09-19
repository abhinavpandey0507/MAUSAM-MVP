/**
 * IMD data client. Tries official/legacy IMD sources in order, then degrades to
 * the clearly-labelled simulator. Never throws; always returns a status object.
 */
import { config } from '../config.js';
import { getStation } from '../data/stations.js';
import { fetchText, fetchJson } from '../utils/http.js';
import {
  parseObservationHtml,
  parseV1Current,
  parseV1Forecast,
  parseV1Nowcast,
  parseV1Warnings,
  parseV1Rainfall
} from './parsers.js';
import {
  simulateWeatherBundle,
  simulateWarnings,
  simulateNowcast,
  simulateRainfall
} from '../demo/simulator.js';

const HOME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const SITE_REF = 'https://mausam.imd.gov.in/';
const V1_HEADERS = () =>
  config.imdApiKey ? { Authorization: `Bearer ${config.imdApiKey}` } : {};

const fmtLegacy = (stationId) => stationId;

export const liveCapability = {
  observation: null, // 'ok' | 'down' | null
  v1Apis: null, // 'ok' | 'down' | null
  radar: null,
  satellite: null
};

function statusLabel(ok) {
  return ok === null ? 'untested' : ok ? 'ok' : 'down';
}

export function liveStatus() {
  return {
    imdV1: statusLabel(liveCapability.v1Apis),
    observationScrape: statusLabel(liveCapability.observation),
    radarProducts: statusLabel(liveCapability.radar),
    satelliteImagery: statusLabel(liveCapability.satellite),
    apiKeyConfigured: Boolean(config.imdApiKey),
    liveEnabled: config.enableLiveImd
  };
}

/* ------------------------- current observation ------------------------ */
export async function getObservation(cityId) {
  const city = getStation(cityId);
  // 1) Official v1 current_wx (requires key)
  if (config.enableLiveImd && config.imdApiKey) {
    const url = `${config.imdV1Base}/current_wx?id=${fmtLegacy(city.stationId)}`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.current, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const obs = parseV1Current(r.data);
      if (obs) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: { ...obs, stationName: obs.stationName || city.obsName }, via: 'imd-v1-current_wx' };
      }
    }
  }

  // 2) HTML observation scrape from the IMD regional/home page (no key required)
  if (config.enableLiveImd) {
    const pageUrl = city.siteSlug === 'newdelhi' ? `${config.siteBase}/` : `${config.siteBase}/${city.siteSlug}/`;
    const r = await fetchText(pageUrl, { timeoutMs: config.timeoutsMs.current, referer: config.siteBase });
    if (r.ok) {
      const obs = parseObservationHtml(r.text, city);
      if (obs) {
        liveCapability.observation = true;
        return { ok: true, live: true, value: obs, via: `imd-observation-scrape` };
      }
    }
    if (liveCapability.observation === null) liveCapability.observation = false;
  }

  // 3) Legacy endpoint referenced in SIH problem statement (may require IP whitelist/key)
  if (config.enableLiveImd) {
    const url = `${config.imdLegacyBase}/current_wx_api.php?id=${fmtLegacy(city.stationId)}`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.current, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const obs = parseV1Current(r.data);
      if (obs) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: obs, via: 'imd-legacy-current-wx' };
      }
    }
  }

  return { ok: false, live: false, value: null, via: null, note: 'No IMD live current-wx available (key/IP required or source unreachable)' };
}

/* ------------------------------ forecast ------------------------------ */
export async function getForecast(cityId) {
  const city = getStation(cityId);
  if (config.enableLiveImd && config.imdApiKey) {
    const url = `${config.imdV1Base}/cityforecast?id=${fmtLegacy(city.forecastId)}`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.forecast, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const fc = parseV1Forecast(r.data);
      if (fc) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: fc, via: 'imd-v1-cityforecast' };
      }
    }
  }
  const url = `${config.cityBase}/cityweather.php?cityid=${fmtLegacy(city.forecastId)}`;
  const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.forecast, referer: SITE_REF });
  if (r.ok) {
    const fc = parseV1Forecast(r.data);
    if (fc) return { ok: true, live: true, value: fc, via: 'imd-cityweather' };
  }
  return { ok: false, live: false, value: null, via: null };
}

/* ------------------------- nowcast & warnings ------------------------- */
export async function getDistrictNowcast(cityId) {
  const city = getStation(cityId);
  if (config.enableLiveImd && config.imdApiKey) {
    const url = `${config.imdV1Base}/districtnowcast`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.nowcast, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const rows = parseV1Nowcast(r.data);
      const mine = rows.filter((x) => x.location?.toUpperCase().includes(city.district.toUpperCase()) || city.district.includes(x.location?.toUpperCase()));
      if (rows.length) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: mine.length ? mine : rows, via: 'imd-v1-districtnowcast' };
      }
    }
  }
  const url = `${config.imdLegacyBase}/nowcast_district_api.php`;
  const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.nowcast, referer: SITE_REF });
  if (r.ok) {
    const rows = parseV1Nowcast(r.data);
    if (rows.length) return { ok: true, live: true, value: rows, via: 'imd-nowcast-district' };
  }
  return { ok: false, live: false, value: null, via: null };
}

export async function getDistrictWarnings(cityId) {
  const city = getStation(cityId);
  if (config.enableLiveImd && config.imdApiKey) {
    const url = `${config.imdV1Base}/districtwarning`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.warnings, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const rows = parseV1Warnings(r.data);
      if (rows.length) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: rows, via: 'imd-v1-districtwarning' };
      }
    }
  }
  const url = `${config.imdLegacyBase}/warnings_district_api.php`;
  const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.warnings, referer: SITE_REF });
  if (r.ok) {
    const rows = parseV1Warnings(r.data);
    if (rows.length) return { ok: true, live: true, value: rows, via: 'imd-warnings-district' };
  }
  return { ok: false, live: false, value: null, via: null };
}

export async function getDistrictRainfall(cityId) {
  const city = getStation(cityId);
  if (config.enableLiveImd && config.imdApiKey) {
    const url = `${config.imdV1Base}/districtrainfall`;
    const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.warnings, headers: V1_HEADERS(), referer: SITE_REF });
    if (r.ok) {
      const rows = parseV1Rainfall(r.data);
      if (rows.length) {
        liveCapability.v1Apis = true;
        return { ok: true, live: true, value: rows, via: 'imd-v1-districtrainfall' };
      }
    }
  }
  const url = `${config.imdLegacyBase}/districtwise_rainfall_api.php`;
  const r = await fetchJson(url, { timeoutMs: config.timeoutsMs.warnings, referer: SITE_REF });
  if (r.ok) {
    const rows = parseV1Rainfall(r.data);
    if (rows.length) return { ok: true, live: true, value: rows, via: 'imd-rainfall-district' };
  }
  return { ok: false, live: false, value: null, via: null };
}

/* --------------------------- radar & satellite ------------------------ */
/** Official IMD radar animation loops (real, keyless, live products). */
export async function getRadarInfo(cityId) {
  const city = getStation(cityId);
  const baseImg = `${config.siteBase}/Radar/animation/Converted`;
  const candidates = {
    sri: `${baseImg}/${city.radarCode}_SRI.gif`,
    maxz: `${baseImg}/${city.radarCode}_MAXZ.gif`
  };
  const r = await fetchText(candidates.sri, { timeoutMs: config.timeoutsMs.radar, referer: SITE_REF });
  if (r.ok) {
    liveCapability.radar = true;
    return {
      ok: true,
      live: true,
      value: {
        station: city.name,
        radarCode: city.radarCode,
        sri: candidates.sri,
        maxz: candidates.maxz,
        animationPage: `${config.siteBase}/imd_latest/contents/index_radar_animation.php?id=${city.radarCode}`,
        mosaicPage: `${config.siteBase}/imd_latest/contents/index_mosaic.php`,
        radarPage: `${config.siteBase}/imd_latest/contents/index_radar.php`
      }
    };
  }
  return { ok: false, live: false, value: null, via: null };
}

/** Official IMD INSAT-3D satellite imagery (real, keyless, live product). */
export async function getSatelliteInfo() {
  const imageUrl = `${config.siteBase}/Satellite/3Dasiasec_ir1.jpg`;
  const infoUrl = `${config.siteBase}/imd_latest/contents/satellite.php`;
  const r = await fetchText(imageUrl, { timeoutMs: config.timeoutsMs.satellite, referer: SITE_REF });
  if (r.ok) {
    liveCapability.satellite = true;
    return {
      ok: true,
      live: true,
      value: {
        imageUrl,
        satellitePage: infoUrl,
        rapidscanPage: `${config.siteBase}/imd_latest/contents/rapidscan.php`,
        product: 'INSAT-3D/3DR Asia Sector - IR1',
        updatedEveryMinutes: 5
      }
    };
  }
  return { ok: false, live: false, value: null, via: null };
}

/* ------------------------------ fallbacks ------------------------------ */
export function fallbackBundle(cityId, mode = 'fallback') {
  return { ...simulateWeatherBundle(cityId, { mode }), source: 'simulated' };
}

export { simulateWarnings, simulateNowcast, simulateRainfall };