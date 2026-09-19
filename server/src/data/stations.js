/**
 * Station mapping for the 7 supported MVP cities.
 * `stationId`       -> IMD station code used by current-wx APIs (Safdarjung = 42181 for Delhi).
 * `forecastId`      -> station code used by cityforecast APIs.
 * `radarCode`       -> Doppler radar product code used in official radar animation loops.
 * `siteSlug`        -> regional IMD website path used for homepage observation scraping.
 * `district`/`state`-> used for district nowcast & warnings lookups.
 * `obsName`         -> the observation-station name shown on IMD pages.
 *
 * NOTE: The exact numeric station codes published by IMD can change / differ across
 * the legacy and v1 platforms. When an API key is configured the map can be refined
 * against https://api.imd.gov.in/api/v1/cityforecast_mapping.
 */
const stations = [
  {
    id: 'new-delhi',
    name: 'New Delhi',
    stationId: '42181',
    forecastId: '42182',
    radarCode: 'DELHI',
    siteSlug: 'newdelhi',
    obsName: 'New Delhi-Safdarjung',
    district: 'NEW DELHI',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.209
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh',
    stationId: '42057',
    forecastId: '42057',
    radarCode: 'DELHI', // no local DWR - nearest network radar (Delhi) is referenced
    siteSlug: 'chandigarh',
    obsName: 'Chandigarh',
    district: 'CHANDIGARH',
    state: 'Chandigarh',
    lat: 30.7333,
    lon: 76.7794
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    stationId: '43057',
    forecastId: '43057',
    radarCode: 'MPT',
    siteSlug: 'mumbai',
    obsName: 'Mumbai (Colaba)',
    district: 'MUMBAI',
    state: 'Maharashtra',
    lat: 19.076,
    lon: 72.8777
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    stationId: '43295',
    forecastId: '43295',
    radarCode: 'MLR',
    siteSlug: 'bengaluru',
    obsName: 'Bengaluru',
    district: 'BENGALURU URBAN',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946
  },
  {
    id: 'chennai',
    name: 'Chennai',
    stationId: '43244',
    forecastId: '43244',
    radarCode: 'CNI',
    siteSlug: 'chennai',
    obsName: 'Chennai (Nungambakkam)',
    district: 'CHENNAI',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    stationId: '42809',
    forecastId: '42809',
    radarCode: 'KOL',
    siteSlug: 'kolkata',
    obsName: 'Kolkata (Alipore)',
    district: 'KOLKATA',
    state: 'West Bengal',
    lat: 22.5726,
    lon: 88.3639
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    stationId: '43128',
    forecastId: '43128',
    radarCode: 'HYD',
    siteSlug: 'hyderabad',
    obsName: 'Hyderabad',
    district: 'HYDERABAD',
    state: 'Telangana',
    lat: 17.385,
    lon: 78.4867
  }
];

export const STATIONS = stations;
export const getStation = (loc) =>
  stations.find((s) => s.id === loc || s.name.toLowerCase() === String(loc).toLowerCase()) || stations[0];