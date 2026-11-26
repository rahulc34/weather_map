/**
 * Thin fetch wrapper for the SmogSense API. The browser only ever talks to our
 * own server — no third-party keys or endpoints are exposed to the client.
 */

export class ApiError extends Error {
  /**
   * @param {string} message user-safe message from the server (or a generic one)
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
 * @param {string} path
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('', { code: 'NETWORK_ERROR' });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error?.message ?? '', {
      status: response.status,
      code: data?.error?.code ?? 'ERROR',
    });
  }
  return data;
}

/** @param {string} query @param {AbortSignal} [signal] */
export const searchCities = (query, signal) =>
  request(`/api/geocode?${new URLSearchParams({ q: query })}`, { signal }).then((d) => d.results);

/** @param {number} lat @param {number} lon @param {AbortSignal} [signal] */
export const getAirQuality = (lat, lon, signal) =>
  request(`/api/air-quality?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`, {
    signal,
  });

/** @param {object} payload @param {AbortSignal} [signal] */
export const getPlan = (payload, signal) =>
  request('/api/plan', { method: 'POST', body: payload, signal });

/** @param {object} payload @param {AbortSignal} [signal] */
export const askQuestion = (payload, signal) =>
  request('/api/chat', { method: 'POST', body: payload, signal });

/** The browser's IANA time zone, used to express forecast windows in local time. */
export const userTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Choose the message to show for an error: the server's safe message when
 * present, otherwise a localised generic one.
 * @param {unknown} err
 * @param {(key: string) => string} t
 */
export function errorMessage(err, t) {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK_ERROR') return t('errors.network');
    if (err.message) return err.message;
  }
  return t('errors.generic');
}
