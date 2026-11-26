/**
 * Minimal HTTP client for the OpenWeather APIs. It owns the API key, the
 * timeout and error mapping; the key-bearing URL is never logged.
 */
import { UpstreamError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

/** OpenWeather endpoints used by SmogSense. */
export const OPENWEATHER_PATHS = Object.freeze({
  geocode: '/geo/1.0/direct',
  reverseGeocode: '/geo/1.0/reverse',
  airPollution: '/data/2.5/air_pollution',
  forecast: '/data/2.5/air_pollution/forecast',
});

const UNAVAILABLE_MESSAGE = 'Live air quality data is temporarily unavailable.';

/**
 * Build the request URL, including the API key.
 * @param {{ baseUrl: string, apiKey: string, path: string, params: Record<string, string | number> }} parts
 * @returns {URL} request URL
 */
function buildUrl({ baseUrl, apiKey, path, params }) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  url.searchParams.set('appid', apiKey);
  return url;
}

/**
 * Create a `getJson(path, params)` function bound to one API key.
 * @param {{ apiKey: string, baseUrl: string, timeoutMs: number, fetchImpl?: typeof fetch }} options
 * @returns {(path: string, params: Record<string, string | number>) => Promise<any>} JSON fetcher
 */
export function createOpenWeatherClient({
  apiKey,
  baseUrl,
  timeoutMs,
  fetchImpl = globalThis.fetch,
}) {
  return async function getJson(path, params) {
    if (!apiKey) {
      throw new UpstreamError('Live air quality data is not configured on this server.', {
        code: 'AQI_NOT_CONFIGURED',
      });
    }
    let response;
    try {
      response = await fetchImpl(buildUrl({ baseUrl, apiKey, path, params }), {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      logger.warn('OpenWeather request failed', { path, reason: err?.name ?? 'Error' });
      throw new UpstreamError(UNAVAILABLE_MESSAGE, { cause: err });
    }
    if (!response.ok) {
      logger.warn('OpenWeather non-OK response', { path, status: response.status });
      throw new UpstreamError(UNAVAILABLE_MESSAGE);
    }
    return response.json();
  };
}
