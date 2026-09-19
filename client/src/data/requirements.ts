import type { PersonaId } from '../types';

/**
 * Onboarding requirement catalog. The labels shown in the UI come from i18n
 * keys "req.<id>". Requirements are multi-select and adapt to the selected
 * personas. They feed the personalization scoring layer as boosts.
 */

export type RequirementId = string;

/** Default requirement set per persona (shown preselected in onboarding). */
export const PERSONA_REQUIREMENTS: Record<PersonaId, RequirementId[]> = {
  runner: ['best_running_time', 'heat', 'uv', 'rain', 'wind', 'humidity', 'air_quality', 'sunrise_sunset'],
  farmer: ['rainfall', 'temperature', 'humidity', 'rain_timing', 'severe_weather', 'soil_conditions', 'crop_planning', 'field_work_time'],
  commuter: ['rain', 'visibility', 'fog', 'wind', 'storm', 'road_conditions', 'severe_weather'],
  aviation: ['wind', 'visibility', 'weather_warnings', 'airport_conditions', 'metar_taf', 'cloud_ceiling'],
  traveler: ['destination_weather', 'rain', 'temperature', 'severe_weather', 'multi_day_forecast', 'travel_alerts'],
  family: ['rain', 'heat', 'severe_weather', 'air_quality', 'outdoor_comfort', 'school_commute'],
  event: ['rain_probability', 'temperature', 'wind', 'outdoor_comfort', 'severe_weather', 'extended_forecast'],
  beach: ['sea_conditions', 'tide', 'wind', 'waves', 'water_conditions', 'coastal_warnings'],
  gardener: ['rain', 'temperature', 'humidity', 'frost', 'rainfall_forecast', 'planting_conditions'],
  general: ['temperature', 'rain', 'forecast', 'aqi', 'severe_weather', 'sunrise_sunset'],
  cyclist: ['rain', 'wind', 'temperature', 'humidity', 'uv', 'road_conditions'],
  outdoor: ['heat', 'rain', 'wind', 'severe_weather', 'uv', 'field_work_time'],
  student: ['temperature', 'rain', 'forecast', 'commute_conditions', 'school_commute', 'uv'],
  researcher: ['forecast', 'severe_weather', 'rainfall', 'wind', 'temperature', 'metar_taf']
};

/** Which widgets each requirement boosts in the scoring layer. */
export const REQUIREMENT_BOOSTS: Record<RequirementId, string[]> = {
  best_running_time: ['outdoor_window', 'hourly'],
  heat: ['temperature', 'outdoor_window'],
  uv: ['uv'],
  rain: ['rain', 'rain_risk'],
  wind: ['wind', 'storm'],
  humidity: ['humidity'],
  air_quality: ['air_quality'],
  sunrise_sunset: ['outdoor_window', 'generic'],
  rainfall: ['rainfall', 'rain', 'rain_risk'],
  temperature: ['temperature', 'current'],
  rain_timing: ['hourly', 'rain_risk', 'rainfall'],
  severe_weather: ['severe_weather', 'storm'],
  soil_conditions: ['field_work', 'farm_insight'],
  crop_planning: ['farm_insight', 'forecast_5'],
  field_work_time: ['field_work', 'hourly', 'outdoor_window'],
  visibility: ['visibility'],
  fog: ['fog'],
  storm: ['storm', 'severe_weather'],
  road_conditions: ['commute', 'rain_risk'],
  weather_warnings: ['severe_weather', 'storm'],
  airport_conditions: ['aviation', 'visibility'],
  metar_taf: ['aviation', 'wind', 'visibility'],
  cloud_ceiling: ['aviation', 'severe_weather'],
  destination_weather: ['destination'],
  multi_day_forecast: ['forecast_7', 'travel_insight'],
  travel_alerts: ['travel_insight', 'severe_weather'],
  rain_probability: ['rain', 'rain_risk'],
  outdoor_comfort: ['outdoor_window', 'temperature'],
  extended_forecast: ['forecast_7', 'forecast_5'],
  sea_conditions: ['sea_conditions'],
  tide: ['sea_conditions'],
  waves: ['sea_conditions'],
  water_conditions: ['sea_conditions'],
  coastal_warnings: ['sea_conditions', 'severe_weather'],
  frost: ['fog', 'temperature', 'field_work'],
  rainfall_forecast: ['rainfall', 'rain'],
  planting_conditions: ['farm_insight', 'field_work', 'temperature'],
  forecast: ['forecast_5', 'forecast_7'],
  aqi: ['air_quality'],
  commute_conditions: ['commute', 'hourly'],
  school_commute: ['commute', 'rain_risk']
};

/** Union of every requirement used across all personas (for catalog rendering). */
export function uniqueRequirements(personas: PersonaId[]): RequirementId[] {
  const set = new Set<string>();
  for (const p of personas) for (const r of PERSONA_REQUIREMENTS[p] ?? []) set.add(r);
  return Array.from(set);
}