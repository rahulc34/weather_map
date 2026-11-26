/**
 * Air-quality service: geocoding, current air pollution and 24-h forecast,
 * with caching. Optional parts (forecast, place name) degrade to `null`
 * instead of failing the whole report.
 */
import { TtlLruCache } from '../utils/cache.js';
import { OPENWEATHER_PATHS, createOpenWeatherClient } from './openWeatherClient.js';
import { roundCoord, toCities, toForecast, toPlaceName, toReport } from './airQualityMappers.js';

const MAX_CITY_RESULTS = 5;

/**
 * Resolve a promise, or `null` if it rejects (for optional data).
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T | null>} the value, or null on failure
 */
const orNull = (promise) => promise.catch(() => null);

/**
 * @param {{ apiKey: string, baseUrl: string, timeoutMs: number, ttlMs: number, geocodeTtlMs: number, maxEntries?: number, fetchImpl?: typeof fetch }} options
 * @returns {{ searchCities: (query: string) => Promise<import('./airQualityMappers.js').City[]>, getReport: (lat: number, lon: number) => Promise<import('./airQualityMappers.js').AirQualityReport> }} service
 */
export function createAirQualityService({
  ttlMs,
  geocodeTtlMs,
  maxEntries = 500,
  ...clientOptions
}) {
  const getJson = createOpenWeatherClient(clientOptions);
  const reportCache = new TtlLruCache({ ttlMs, maxEntries });
  const geoCache = new TtlLruCache({ ttlMs: geocodeTtlMs, maxEntries });

  /**
   * Search for cities by name (cached for a day).
   * @param {string} query already validated and sanitised
   * @returns {Promise<import('./airQualityMappers.js').City[]>} matching cities
   */
  const searchCities = (query) =>
    geoCache.getOrSet(`geo:${query.toLowerCase()}`, async () =>
      toCities(await getJson(OPENWEATHER_PATHS.geocode, { q: query, limit: MAX_CITY_RESULTS })),
    );

  /**
   * Place name for coordinates, or null on failure.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<string | null>} place name
   */
  const reverseGeocode = (lat, lon) =>
    orNull(
      geoCache.getOrSet(`rev:${lat},${lon}`, async () =>
        toPlaceName(await getJson(OPENWEATHER_PATHS.reverseGeocode, { lat, lon, limit: 1 })),
      ),
    );

  /**
   * Full report for a location (cached ~10 minutes per ~1 km cell).
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<import('./airQualityMappers.js').AirQualityReport>} report
   */
  const getReport = (latitude, longitude) => {
    const lat = roundCoord(latitude);
    const lon = roundCoord(longitude);
    return reportCache.getOrSet(`aq:${lat},${lon}`, async () => {
      const [current, forecastData, name] = await Promise.all([
        getJson(OPENWEATHER_PATHS.airPollution, { lat, lon }),
        orNull(getJson(OPENWEATHER_PATHS.forecast, { lat, lon })),
        reverseGeocode(lat, lon),
      ]);
      return toReport({ current, forecast: toForecast(forecastData), name, lat, lon });
    });
  };

  return { searchCities, getReport };
}
