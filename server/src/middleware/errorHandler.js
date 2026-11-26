/**
 * Centralised 404 + error handling. Clients get a generic, safe message;
 * full details (stack, cause) go to server logs only.
 */
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

/** @type {import('express').RequestHandler} */
export function notFound(req, _res, next) {
  next(new HttpError(404, 'The requested resource was not found.', { code: 'NOT_FOUND' }));
}

/**
 * Express identifies error handlers by their 4-argument arity, so `_next` must stay.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, req, res, _next) {
  // Malformed JSON / oversized bodies from express.json()
  if (err?.type === 'entity.parse.failed') {
    err = new HttpError(400, 'Request body must be valid JSON.', { code: 'INVALID_JSON' });
  } else if (err?.type === 'entity.too.large') {
    err = new HttpError(413, 'Request body is too large.', { code: 'PAYLOAD_TOO_LARGE' });
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.warn('Upstream/handled server error', {
        path: req.path,
        code: err.code,
        cause: err.cause?.message,
      });
    }
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  logger.error('Unhandled error', { path: req.path, message: err?.message, stack: err?.stack });
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
}
