/**
 * Tolerant parsers that convert various IMD response shapes (page HTML,
 * official v1 JSON, legacy JSON) into MAUSAM's normalized objects. The UI never
 * touches raw IMD structures.
 */
import { toNum, pick, findValueNear } from '../utils/http.js';

const strip = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* HTML observation block from mausam.imd.gov.in homepage / regionals  */
/* ------------------------------------------------------------------ */
export function parseObservationHtml(html, station) {
  // Only parse pages that actually embed the observation card div (the official
  // homepage does; several regional pages only mention the string elsewhere).
  const divIdx = html.indexOf('id="city_weather"');
  const idx = divIdx >= 0 ? divIdx : html.indexOf('class="city_weather"');
  if (idx < 0) return null;
  const keep = html.substring(idx, Math.min(html.length, idx + 1800));

  // temperature: " 32.4o</sup>C " or "32.4°C" or "32.4 C"
  const tempMatch =
    keep.match(/(\d{1,3}(?:\.\d+)?)\s*(?:°|&deg;|deg|C)/i) ||
    keep.match(/(\d{1,3}(?:\.\d+)?)<sup>o<\/sup>\s*C/i) ||
    keep.match(/(-?\d{1,3}(?:\.\d+)?)\s*[o°]?\s*C/i);
  const feelsMatch = keep.match(/Feel Like\s*(\d{1,3}(?:\.\d+)?)/i);
  const humMatch = keep.match(/(\d{1,3})\s*%/);
  const windMatch = keep.match(/([A-Za-z]{2,3})\s*(\d{1,3}(?:\.\d+)?)\s*K?m\/h/i) || keep.match(/(Calm)\s*(\d{1,3}(?:\.\d+)?)?\s*K?m\/h/i);
  const timeMatch = keep.match(/Observation time\s*:\s*([\d\-: ]+)/i);
  const condMatch = keep.match(/<span>([^<]+)<\/span>/);

  const temperature = tempMatch ? toNum(tempMatch[1]) : NaN;
  // Plausibility guard: a scraping smudge must never be presented as live data.
  if (!Number.isFinite(temperature) || temperature < -30 || temperature > 60) return null;

  const humidity = humMatch ? toNum(humMatch[1]) : NaN;
  const windSpeed = windMatch ? (windMatch[2] ? toNum(windMatch[2]) : 0) : NaN;
  const stationName = strip(
    keep.match(/<h3>([^<]+)<\/h3>/) ? keep.match(/<h3>([^<]+)<\/h3>/)[1] : station?.obsName || station?.name
  );

  const felt = feelsMatch ? toNum(feelsMatch[1]) : temperature;

  return {
    temperature,
    feelsLike: Number.isFinite(felt) ? felt : temperature,
    humidity,
    windSpeed,
    windDirection: windMatch ? windMatch[1] : '',
    pressure: NaN,
    visibility: NaN,
    rainfall: NaN,
    weatherCondition: condMatch ? strip(condMatch[1]) : '',
    observedAt: timeMatch ? timeMatch[1] : new Date().toISOString(),
    stationName,
    rawTextSnippet: keep.replace(/\s+/g, ' ').slice(0, 220)
  };
}

/* ------------------------------------------------------------------ */
/* Official v1 API: current weather                                    */
/* ------------------------------------------------------------------ */
export function parseV1Current(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  // Field names vary ("Temparature" happens to be misspelled in some IMD docs rows)
  const temperature = toNum(
    pick(row, ['Temperature', 'TEMPERATURE', 'Temp', 'Temparature', 'Temp C', 'tC']) ?? NaN
  );
  if (!Number.isFinite(temperature)) return null;
  const fav = pick(row, ['Feel Like', 'Feels Like', 'FEELS_LIKE', 'Feel_like']) ;
  return {
    temperature,
    feelsLike: fav !== undefined ? toNum(fav) : temperature,
    humidity: toNum(pick(row, ['Humidity', 'RH', 'Relative Humidity', 'RH%', 'humidity']) ?? NaN),
    windSpeed: toNum(pick(row, ['Wind Speed', 'Wind', 'WindSpeed', 'WS km/h']) ?? NaN),
    windDirection: strip(pick(row, ['Wind Direction', 'WD', 'Direction']) ?? ''),
    pressure: toNum(pick(row, ['Pressure', 'SLP', 'MSLP']) ?? NaN),
    rainfall: toNum(pick(row, ['Rainfall', 'Rain', 'Rain mm', 'Precipitation']) ?? NaN),
    weatherCondition: strip(pick(row, ['Weather Condition', 'Condition', 'Wx', 'Sky Condition', 'VWS STATUS']) ?? ''),
    observedAt: strip(pick(row, ['Observation Time', 'Observation time', 'Time', 'Date & Time', 'DateTime']) ?? new Date().toISOString()),
    stationName: strip(pick(row, ['Station', 'Station Name', 'StationName', 'State']) ?? '')
  };
}

/* ------------------------------------------------------------------ */
/* Official v1 API: 7-day city forecast                                */
/* ------------------------------------------------------------------ */
function forecastRowToDay(row) {
  const tMax = toNum(pick(row, ['tmax', 'Tmax', 'TMAX', 'Max Temp', 'max_temp']) ?? NaN);
  const tMin = toNum(pick(row, ['tmin', 'Tmin', 'TMIN', 'Min Temp', 'min_temp']) ?? NaN);
  if (!Number.isFinite(tMax)) return null;
  return {
    date: strip(pick(row, ['date', 'Date', 'dt', 'FcDate']) ?? ''),
    weekday: strip(pick(row, ['day', 'Day', 'wd', 'week']) ?? ''),
    tMax,
    tMin,
    condition: strip(pick(row, ['cond', 'Condition', 'Forecast', 'description', 'weather']) ?? ''),
    rainProb: toNum(pick(row, ['rainprob', 'RainProb', 'Rain Probability', 'pop', 'PoP']) ?? NaN),
    rainfall: toNum(pick(row, ['rain', 'Rain', 'rainfall', 'Rainfall', 'mm']) ?? NaN),
    humidity: toNum(pick(row, ['hum', 'Humidity', 'RH']) ?? NaN),
    windSpeed: toNum(pick(row, ['wind', 'Wind', 'Wind Speed', 'ws']) ?? NaN)
  };
}

export function parseV1Forecast(data) {
  const list = Array.isArray(data) ? data : data?.FC || data?.Forecast || data?.records || data?.data;
  if (!Array.isArray(list)) return null;
  const days = list.map(forecastRowToDay).filter(Boolean);
  return days.length ? days.slice(0, 7) : null;
}

/* ------------------------------------------------------------------ */
/* Nowcast & warnings (district/station lists)                          */
/* ------------------------------------------------------------------ */
export function parseV1Nowcast(data) {
  const list = Array.isArray(data) ? data : data?.nowcast || data?.records || [];
  if (!Array.isArray(list)) return [];
  return list.map((row) => ({
    location: strip(pick(row, ['District', 'district', 'Station', 'station', 'Name', 'Region']) ?? ''),
    type: strip(pick(row, ['Event', 'event', 'Nowcast', 'Weather', 'Phenomenon']) ?? ''),
    severity: normalizeSeverity(strip(pick(row, ['Severity', 'severity', 'Warning Class', 'Category']) ?? '')),
    validFrom: strip(pick(row, ['From', 'Validity', 'valid_from', 'Valid From', 'Start']) ?? ''),
    validUntil: strip(pick(row, ['To', 'valid_until', 'Valid Upto', 'End']) ?? ''),
    description: strip(pick(row, ['Description', 'details', 'Remarks', 'Detail']) ?? ''),
    source: 'imd'
  }))
    .filter((n) => n.location || n.type)
    .slice(0, 12);
}

export function normalizeSeverity(raw) {
  const s = String(raw ?? '').toUpperCase();
  if (/NO WARNING|NO-WARNING|NIL|OK/.test(s)) return 'no_warning';
  if (/WARNING|SEVERE|RED/.test(s)) return 'warning';
  if (/ALERT|ORANGE/.test(s)) return 'alert';
  if (/WATCH|YELLOW/.test(s)) return 'watch';
  return s ? 'watch' : 'no_warning';
}

export function parseV1Warnings(data) {
  const list = Array.isArray(data) ? data : data?.warnings || data?.records || [];
  if (!Array.isArray(list)) return [];
  return list.map((row) => ({
    severity: normalizeSeverity(strip(pick(row, ['Warning', 'Severity', 'warning_class', 'Color Code', 'Level']) ?? '')),
    event: strip(pick(row, ['Event', 'event', 'Weather', 'Phenomenon', 'Impact', 'warning_txt']) ?? ''),
    area: strip(pick(row, ['Area', 'District', 'district', 'State', 'Region', 'Division']) ?? ''),
    validFrom: strip(pick(row, ['From', 'Valid From', 'valid_from', 'Start Date']) ?? ''),
    validUntil: strip(pick(row, ['To', 'Valid Upto', 'valid_until', 'End Date']) ?? ''),
    source: 'imd'
  }))
    .filter((w) => w.event || w.area)
    .slice(0, 15);
}

export function parseV1Rainfall(data) {
  const list = Array.isArray(data) ? data : data?.rainfall || data?.records || [];
  if (!Array.isArray(list)) return [];
  return list.map((row) => {
    const actual = toNum(pick(row, ['Daily Actual', 'Actual', 'Rainfall', 'rain_mm']) ?? NaN);
    const norm = toNum(pick(row, ['Normal', 'normal']) ?? NaN);
    return {
      district: strip(pick(row, ['District', 'district']) ?? ''),
      state: strip(pick(row, ['State', 'state']) ?? ''),
      date: strip(pick(row, ['Date', 'date']) ?? ''),
      actual: Number.isFinite(actual) ? actual : 0,
      normal: Number.isFinite(norm) ? norm : 0,
      departure: 0,
      source: 'imd'
    };
  }).filter((r) => r.district).slice(0, 15);
}

/** Best-effort extraction of a severity word from free text. */
export function severityFromText(text) {
  const s = String(text ?? '').toUpperCase();
  const order = ['SEVERE', 'WARNING', 'ALERT', 'WATCH', 'CAUTION'];
  for (const tok of order) if (s.includes(tok)) return { severity: tok.toLowerCase().replace('caution', 'watch') };
  return { severity: 'no_warning' };
}