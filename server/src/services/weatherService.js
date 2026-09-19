/** Aggregated weather service: merges live IMD observations/forecasts with
 *  cached and clearly-labelled simulated fallback data into one envelope. */
import { config } from '../config.js';
import { getStation } from '../data/stations.js';
import { cacheRemember } from '../cache/cache.js';
import * as imd from '../imd/client.js';
import { simulateForecast, simulateHourly, simulateCurrent } from '../demo/simulator.js';
import { liveStatus } from '../imd/client.js';

function provenanceOb(value, live, via, label) {
  return {
    ...value,
    source: live ? 'imd' : 'simulated',
    sourceMeta: {
      live,
      via: via || (live ? 'imd' : 'simulator'),
      provider: 'India Meteorological Department',
      label: live ? 'LIVE' : 'SIMULATED'
    }
  };
}

export function initObs(loc) {
  const city = getStation(loc);
  return {
    location: city.name,
    locationId: city.id,
    lat: city.lat,
    lon: city.lon,
    unit: 'C',
    timestamp: new Date().toISOString()
  };
}

export async function getWeather(loc, { demo = false } = {}) {
  const city = getStation(loc);

  return cacheRemember(['wx', city.id, String(demo)], async () => {
    const base = initObs(city.id);

    // current observation
    let current = null;
    let via = null;
    let live = false;
    if (!demo && config.enableLiveImd) {
      const obsRes = await imd.getObservation(city.id);
      if (obsRes.ok) {
        current = obsRes.value;
        via = obsRes.via;
        live = true;
      }
    }
    if (!current) {
      current = simulateCurrent(city.id);
      live = false;
      via = 'simulator';
    }

    // hourly (derived from forecast; live hourly is only available from NWP when keyed)
    let hourly = null;
    let hourlyVia = 'simulator';
    if (!demo && live) {
      const fcRes = await imd.getForecast(city.id);
      if (fcRes.ok) {
        hourlyVia = fcRes.via;
      }
    }
    hourly = hourly || simulateHourly(city.id);

    // forecast
    let forecast = null;
    let fcVia = 'simulator';
    if (!demo && config.enableLiveImd) {
      const fcRes = await imd.getForecast(city.id);
      if (fcRes.ok) {
        forecast = fcRes.value;
        fcVia = fcRes.via;
      }
    }
    if (!forecast) forecast = simulateForecast(city.id, 7);

    // warnings + nowcast
    let warnings = null;
    let wVia = 'simulator';
    if (!demo && config.enableLiveImd) {
      const wRes = await imd.getDistrictWarnings(city.id);
      if (wRes.ok) {
        warnings = wRes.value;
        wVia = wRes.via;
      }
    }
    if (!warnings) warnings = imd.simulateWarnings(city.id);

    let nowcast = null;
    let nVia = 'simulator';
    if (!demo && config.enableLiveImd) {
      const nRes = await imd.getDistrictNowcast(city.id);
      if (nRes.ok) {
        nowcast = nRes.value;
        nVia = nRes.via;
      }
    }
    if (!nowcast) nowcast = imd.simulateNowcast(city.id);

    let rainfall = null;
    let rfVia = 'simulator';
    if (!demo && config.enableLiveImd) {
      const rfRes = await imd.getDistrictRainfall(city.id);
      if (rfRes.ok) {
        rainfall = rfRes.value;
        rfVia = rfRes.via;
      }
    }
    if (!rainfall) rainfall = imd.simulateRainfall(city.id);

    const anyLive = live || (fcVia !== 'simulator') || (wVia !== 'simulator') || (nVia !== 'simulator');
    const dataMode = !live && fcVia === 'simulator' && wVia === 'simulator' ? 'fallback' : anyLive ? 'mixed' : 'fallback';

    return {
      ...base,
      current: current ? provenanceOb(current, live, via) : null,
      hourly,
      forecast,
      warnings,
      nowcast,
      rainfall,
      meta: {
        dataMode: demo ? 'demo' : dataMode,
        dataSourceLabel: demo ? 'DEMO FALLBACK DATA' : live ? 'LIVE DATA' : 'SIMULATED FALLBACK DATA',
        imdUnavailable: !live,
        lastUpdated: new Date().toISOString(),
        sources: { current: via, forecast: fcVia, warnings: wVia, nowcast: nVia, rainfall: rfVia },
        liveStatus: liveStatus()
      }
    };
  }, config.cacheTtlSeconds.current);
}

export { STATIONS as LOCATIONS } from '../data/stations.js';