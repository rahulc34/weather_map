/**
 * OpenWeather integration: geocoding, current air pollution and 24-h forecast.
 * All responses are cached; partial failures (forecast / place name) degrade
 * gracefully instead of failing the whole request.
 */
import { TtlLruCache } from '../utils/cache.js';
import { computeAqi, describeOwmIndex, findForecastWindows } from '../utils/aqi.js';
import { HttpError, UpstreamError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

const POLLUTANT_KEYS = ['pm2_5', 'pm10', 'no2', 'o3', 'co', 'so2'];
const FORECAST_HOURS = 24;

/**
 * @typedef {object} AirQualityReport
 * @property {{ name: string | null, lat: number, lon: number }} location
 * @property {{ value: number, dominantPollutant: string | null, category: { key: string, label: string, level: number }, owmIndex: { value: number, label: string } | null }} aqi
 * @property {Record<string, number>} pollutants concentrations in µg/m³
 * @property {{ hourly: { time: string, aqi: number, level: number }[], windows: ReturnType<typeof findForecastWindows> } | null} forecast
 * @property {string} observedAt ISO timestamp of the measurement
 */

/**
 * Round coordinates to ~1 km so nearby requests share a cache entry.
 * @param {number} n
 */
const roundCoord = (n) => Math.round(n * 100) / 100;

/** @param {number} unixSeconds */
const toIso = (unixSeconds) => new Date(unixSeconds * 1000).toISOString();

/**
 * Keep only the pollutants we display, rounded to 1 decimal place.
 * @param {Record<string, number>} components
 */
function pickPollutants(components = {}) {
  return Object.fromEntries(
    POLLUTANT_KEYS.filter((k) => typeof components[k] === 'number').map((k) => [
      k,
      Math.round(components[k] * 10) / 10,
    ]),
  );
}

/**
 * @param {{ apiKey: string, baseUrl: string, timeoutMs: number, ttlMs: number, geocodeTtlMs: number, maxEntries?: number, fetchImpl?: typeof fetch }} options
 */
export function createAirQualityService({
  apiKey,
  baseUrl,
  timeoutMs,
  ttlMs,
  geocodeTtlMs,
  maxEntries = 500,
  fetchImpl = globalThis.fetch,
}) {
  const reportCache = new TtlLruCache({ ttlMs, maxEntries });
  const geoCache = new TtlLruCache({ ttlMs: geocodeTtlMs, maxEntries });

  /**
   * GET an OpenWeather endpoint and return parsed JSON.
   * The URL (which contains the API key) is never logged.
   * @param {string} path
   * @param {Record<string, string | number>} params
   */
  async function fetchJson(path, params) {
    if (!apiKey) {
      throw new UpstreamError('Live air quality data is not configured on this server.', {
        code: 'AQI_NOT_CONFIGURED',
      });
    }
    const url = new URL(path, baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    url.searchParams.set('appid', apiKey);

    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      logger.warn('OpenWeather request failed', { path, reason: err?.name ?? 'Error' });
      throw new UpstreamError('Live air quality data is temporarily unavailable.', { cause: err });
    }
    if (!response.ok) {
      logger.warn('OpenWeather non-OK response', { path, status: response.status });
      throw new UpstreamError('Live air quality data is temporarily unavailable.');
    }
    return response.json();
  }

  /**
   * Search for cities by name.
   * @param {string} query already validated & sanitised
   * @returns {Promise<{ name: string, state: string | null, country: string, lat: number, lon: number }[]>}
   */
  function searchCities(query) {
    const key = `geo:${query.toLowerCase()}`;
    return geoCache.getOrSet(key, async () => {
      const data = await fetchJson('/geo/1.0/direct', { q: query, limit: 5 });
      if (!Array.isArray(data)) return [];
      return data.map((p) => ({
        name: p.local_names?.en ?? p.name,
        state: p.state ?? null,
        country: p.country,
        lat: p.lat,
        lon: p.lon,
      }));
    });
  }

  /**
   * Resolve a place name for coordinates; returns null on failure.
   * @param {number} lat
   * @param {number} lon
   */
  async function reverseGeocode(lat, lon) {
    try {
      return await geoCache.getOrSet(`rev:${lat},${lon}`, async () => {
        const data = await fetchJson('/geo/1.0/reverse', { lat, lon, limit: 1 });
        const place = Array.isArray(data) ? data[0] : null;
        return place ? [place.name, place.state, place.country].filter(Boolean).join(', ') : null;
      });
    } catch {
      return null;
    }
  }

  /**
   * Hourly NAQI forecast for the next 24 h; returns null on failure.
   * @param {number} lat
   * @param {number} lon
   */
  async function fetchForecast(lat, lon) {
    try {
      const data = await fetchJson('/data/2.5/air_pollution/forecast', { lat, lon });
      const nowSec = Date.now() / 1000;
      const hourly = (data?.list ?? [])
        .filter((e) => e.dt >= nowSec - 3600)
        .slice(0, FORECAST_HOURS)
        .map((e) => {
          const { value, category } = computeAqi(e.components);
          return { time: toIso(e.dt), aqi: value, level: category.level };
        });
      return hourly.length ? { hourly, windows: findForecastWindows(hourly) } : null;
    } catch {
      return null;
    }
  }

  /**
   * Full air quality report for a location (cached ~10 minutes).
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<AirQualityReport>}
   */
  function getReport(latitude, longitude) {
    const lat = roundCoord(latitude);
    const lon = roundCoord(longitude);
    return reportCache.getOrSet(`aq:${lat},${lon}`, async () => {
      const [current, forecast, name] = await Promise.all([
        fetchJson('/data/2.5/air_pollution', { lat, lon }),
        fetchForecast(lat, lon),
        reverseGeocode(lat, lon),
      ]);
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
    });
  }

  return { searchCities, getReport };
}
