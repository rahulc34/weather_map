/**
 * Thin fetch wrapper for the SmogSense API. The browser only ever talks to our
 * own server — no third-party keys or endpoints are exposed to the client.
 */

/** Error returned by the API (or a network failure), with a user-safe message. */
export class ApiError extends Error {
  /**
   * @param {string} message user-safe message from the server ('' when none)
   * @param {{ status?: number, code?: string }} [info]
   */
  constructor(message, { status = 0, code = 'ERROR' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Whether an error came from aborting a superseded request.
 * @param {unknown} err
 * @returns {boolean} true for AbortError
 */
export const isAbortError = (err) => /** @type {any} */ (err)?.name === 'AbortError';

/**
 * fetch() options for a JSON request.
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} options
 * @returns {RequestInit} request init
 */
function toRequestInit({ method = 'GET', body, signal }) {
  if (body === undefined) return { method, signal };
  return {
    method,
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * Parse a response, turning non-2xx statuses into ApiError.
 * @param {Response} response
 * @returns {Promise<any>} parsed JSON body
 */
async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  throw new ApiError(data?.error?.message ?? '', {
    status: response.status,
    code: data?.error?.code ?? 'ERROR',
  });
}

/**
 * Call the API and return parsed JSON.
 * @param {string} path
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 * @returns {Promise<any>} response body
 */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, toRequestInit(options));
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError('', { code: 'NETWORK_ERROR' });
  }
  return parseResponse(response);
}

/**
 * @param {string} query city name
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ name: string, state: string | null, country: string, lat: number, lon: number }[]>} matching cities
 */
export const searchCities = (query, signal) =>
  request(`/api/geocode?${new URLSearchParams({ q: query })}`, { signal }).then((d) => d.results);

/**
 * @param {number} lat
 * @param {number} lon
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>} live air-quality report
 */
export const getAirQuality = (lat, lon, signal) =>
  request(`/api/air-quality?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`, {
    signal,
  });

/**
 * @param {object} payload see buildContextPayload
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>} AI plan response
 */
export const getPlan = (payload, signal) =>
  request('/api/plan', { method: 'POST', body: payload, signal });

/**
 * @param {object} payload context payload plus `question` and `history`
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ answer: string, safetyNote: string, source: string }>} chat answer
 */
export const askQuestion = (payload, signal) =>
  request('/api/chat', { method: 'POST', body: payload, signal });

/**
 * The browser's IANA time zone, used to express forecast windows in local time.
 * @returns {string} e.g. "Asia/Kolkata"
 */
export const userTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Request body shared by the plan and chat endpoints.
 * @param {{ location: { name?: string, lat: number, lon: number }, profile: object, lang: 'en'|'hi' }} context
 * @returns {object} payload
 */
export function buildContextPayload({ location, profile, lang }) {
  return {
    lat: location.lat,
    lon: location.lon,
    locationName: location.name || undefined,
    lang,
    timeZone: userTimeZone(),
    profile,
  };
}

/**
 * Choose the message to show for an error: the server's safe message when
 * present, otherwise a localised generic one.
 * @param {unknown} err
 * @param {(key: string) => string} t translate function
 * @returns {string} message for the user
 */
export function errorMessage(err, t) {
  if (!(err instanceof ApiError)) return t('errors.generic');
  if (err.code === 'NETWORK_ERROR') return t('errors.network');
  return err.message || t('errors.generic');
}
