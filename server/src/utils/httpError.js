/**
 * An error that carries an HTTP status and a client-safe message.
 * Anything that is NOT an HttpError is treated as an internal error and
 * its message is never sent to the client.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} publicMessage message safe to show to end users
   * @param {{ code?: string, cause?: unknown, details?: unknown }} [options]
   */
  constructor(status, publicMessage, { code, cause, details } = {}) {
    super(publicMessage, { cause });
    this.name = 'HttpError';
    this.status = status;
    this.code = code ?? 'ERROR';
    this.details = details;
  }
}

/** Upstream (OpenWeather / Gemini) failure — reported to clients as 503. */
export class UpstreamError extends HttpError {
  /**
   * @param {string} publicMessage
   * @param {{ code?: string, cause?: unknown }} [options]
   */
  constructor(publicMessage, options = {}) {
    super(503, publicMessage, {
      code: options.code ?? 'UPSTREAM_UNAVAILABLE',
      cause: options.cause,
    });
    this.name = 'UpstreamError';
  }
}
