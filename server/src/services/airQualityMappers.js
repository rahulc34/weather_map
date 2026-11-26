/**
 * Pure functions that turn raw OpenWeather payloads into SmogSense's shapes.
 * No I/O here, so every mapping is trivially unit-testable.
 */
import { POLLUTANTS } from '@smogsense/shared';
import { computeAqi, describeOwmIndex, findForecastWindows } from '../utils/aqi.js';
import { HttpError } from '../utils/httpError.js';

const FORECAST_HOURS = 24;
const SECONDS_PER_HOUR = 3600;

/**
 * @typedef {object} City
 * @property {string} name
 * @property {string | null} state
 * @property {string} country
 * @property {number} lat
 * @property {number} lon
 */

/**
 * @typedef {object} AirQualityReport
 * @property {{ name: string | null, lat: number, lon: number }} location
 * @property {{ value: number, dominantPollutant: string | null, category: { key: string, label: string, level: number }, owmIndex: { value: number, label: string } | null }} aqi
 * @property {Record<string, number>} pollutants concentrations in µg/m³
 * @property {{ hourly: { time: string, aqi: number, level: number }[], windows: ReturnType<typeof findForecastWindows> } | null} forecast
 * @property {string} observedAt ISO timestamp of the measurement
 */

/**
 * Round a coordinate to ~1 km so nearby requests share a cache entry.
 * @param {number} value
 * @returns {number} coordinate rounded to 2 decimal places
 */
export const roundCoord = (value) => Math.round(value * 100) / 100;

/**
 * @param {number} unixSeconds
 * @returns {string} ISO-8601 timestamp
 */
export const toIso = (unixSeconds) => new Date(unixSeconds * 1000).toISOString();

/**
 * Map geocoding results to cities (English names preferred).
 * @param {unknown} data raw `/geo/1.0/direct` response
 * @returns {City[]} matching cities
 */
export function toCities(data) {
  if (!Array.isArray(data)) return [];
  return data.map((place) => ({
    name: place.local_names?.en ?? place.name,
    state: place.state ?? null,
    country: place.country,
    lat: place.lat,
    lon: place.lon,
  }));
}

/**
 * "New Delhi, Delhi, IN" from a reverse-geocoding response.
 * @param {unknown} data raw `/geo/1.0/reverse` response
 * @returns {string | null} place name, or null if unknown
 */
export function toPlaceName(data) {
  const place = Array.isArray(data) ? data[0] : null;
  return place ? [place.name, place.state, place.country].filter(Boolean).join(', ') : null;
}

/**
 * Keep only the pollutants we display, rounded to 1 decimal place.
 * @param {Record<string, number>} [components]
 * @returns {Record<string, number>} displayed pollutant concentrations
 */
export function pickPollutants(components = {}) {
  return Object.fromEntries(
    POLLUTANTS.filter((key) => typeof components[key] === 'number').map((key) => [
      key,
      Math.round(components[key] * 10) / 10,
    ]),
  );
}

/**
 * Hourly NAQI values for the next 24 h plus cleanest / dirtiest windows.
 * @param {unknown} data raw forecast response
 * @param {number} [nowMs] current time (injectable for tests)
 * @returns {AirQualityReport['forecast']} forecast, or null when empty
 */
export function toForecast(data, nowMs = Date.now()) {
  const fromSec = nowMs / 1000 - SECONDS_PER_HOUR;
  const hourly = /** @type {any} */ (data?.list ?? [])
    .filter((entry) => entry.dt >= fromSec)
    .slice(0, FORECAST_HOURS)
    .map((entry) => {
      const { value, category } = computeAqi(entry.components);
      return { time: toIso(entry.dt), aqi: value, level: category.level };
    });
  return hourly.length ? { hourly, windows: findForecastWindows(hourly) } : null;
}

/**
 * Assemble the report returned by `/api/air-quality`.
 * @param {{ current: any, forecast: AirQualityReport['forecast'], name: string | null, lat: number, lon: number }} parts
 * @returns {AirQualityReport} full report
 * @throws {HttpError} 502 when OpenWeather returned no measurement
 */
export function toReport({ current, forecast, name, lat, lon }) {
  const entry = current?.list?.[0];
  if (!entry?.components) {
    throw new HttpError(502, 'Air quality data for this location is unavailable.', {
      code: 'AQI_EMPTY',
    });
  }
  return {
    location: { name, lat, lon },
    aqi: { ...computeAqi(entry.components), owmIndex: describeOwmIndex(entry.main?.aqi) },
    pollutants: pickPollutants(entry.components),
    forecast,
    observedAt: toIso(entry.dt),
  };
}
