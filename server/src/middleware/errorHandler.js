/**
 * Centralised 404 + error handling. Clients get a generic, safe message;
 * full details (stack, cause) go to server logs only.
 */
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

const GENERIC_ERROR = Object.freeze({
  code: 'INTERNAL_ERROR',
  message: 'Something went wrong. Please try again.',
});

/** body-parser error types mapped to client-safe errors. */
const BODY_PARSER_ERRORS = Object.freeze({
  'entity.parse.failed': () =>
    new HttpError(400, 'Request body must be valid JSON.', { code: 'INVALID_JSON' }),
  'entity.too.large': () =>
    new HttpError(413, 'Request body is too large.', { code: 'PAYLOAD_TOO_LARGE' }),
});

/**
 * Convert known framework errors (malformed / oversized JSON) into HttpErrors.
 * @param {unknown} err
 * @returns {unknown} an HttpError when recognised, otherwise the original error
 */
export function normalizeError(err) {
  const toHttpError = BODY_PARSER_ERRORS[/** @type {any} */ (err)?.type];
  return toHttpError ? toHttpError() : err;
}

/**
 * JSON body for a handled error.
 * @param {HttpError} err
 * @returns {{ error: { code: string, message: string, details?: unknown } }} response body
 */
function toResponseBody(err) {
  const details = err.details ? { details: err.details } : {};
  return { error: { code: err.code, message: err.message, ...details } };
}

/**
 * Express 404 handler for unmatched routes.
 * @type {import('express').RequestHandler}
 */
export function notFound(_req, _res, next) {
  next(new HttpError(404, 'The requested resource was not found.', { code: 'NOT_FOUND' }));
}

/**
 * Final error handler. Express identifies error handlers by their 4-argument
 * arity, so `_next` must stay even though it is unused.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(rawError, req, res, _next) {
  const err = normalizeError(rawError);

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.warn('Upstream/handled server error', {
        path: req.path,
        code: err.code,
        cause: /** @type {Error | undefined} */ (err.cause)?.message,
      });
    }
    return res.status(err.status).json(toResponseBody(err));
  }

  logger.error('Unhandled error', { path: req.path, message: err?.message, stack: err?.stack });
  return res.status(500).json({ error: GENERIC_ERROR });
}
