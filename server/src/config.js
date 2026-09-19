const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const config = {
  port: num(process.env.PORT, 4000),
  // Set to "false" to force demo simulation for all endpoints (judging mode).
  enableLiveImd: process.env.ENABLE_LIVE_IMD !== 'false',
  // Official IMD API Management Platform key (https://api.imd.gov.in) - optional.
  imdApiKey: process.env.IMD_API_KEY || '',
  imdV1Base: process.env.IMD_V1_BASE || 'https://api.imd.gov.in/api/v1',
  // Legacy public endpoints referenced in the SIH26076 problem statement PDF.
  imdLegacyBase: process.env.IMD_LEGACY_BASE || 'https://mausam.imd.gov.in/api',
  cityBase: process.env.IMD_CITY_BASE || 'https://city.imd.gov.in/api',
  siteBase: 'https://mausam.imd.gov.in',
  // Conservative timeouts so the UI never hangs on a dead upstream.
  timeoutsMs: {
    current: 7000,
    forecast: 9000,
    nowcast: 8000,
    warnings: 8000,
    radar: 6000,
    satellite: 6000
  },
  cacheTtlSeconds: {
    current: 180,
    forecast: 900,
    nowcast: 480,
    warnings: 480,
    radar: 300,
    satellite: 300
  }
};