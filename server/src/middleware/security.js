/**
 * Security middleware: HTTP headers (helmet), same-origin CORS and rate limits.
 */
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../utils/httpError.js';

/**
 * Strict security headers with a CSP that only allows our own assets.
 * @returns {import('express').RequestHandler} helmet middleware
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

/**
 * Browser feature policy: geolocation only for our own origin; everything
 * sensitive we don't use is disabled.
 * @type {import('express').RequestHandler}
 */
export function permissionsPolicy(_req, res, next) {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(), usb=()',
  );
  next();
}

/**
 * Is this Origin header the server's own origin or explicitly allowed?
 * @param {import('express').Request} req
 * @param {string[]} allowedOrigins
 * @returns {boolean} true when the request may proceed
 */
export function isOriginAllowed(req, allowedOrigins) {
  const origin = req.get('origin');
  if (!origin) return true; // same-origin navigation, curl, health checks
  const self = `${req.protocol}://${req.get('host')}`;
  return origin === self || allowedOrigins.includes(origin);
}

/**
 * CORS restricted to our own origin (+ configured dev origins). Requests from
 * any other browser origin are rejected outright with 403 rather than merely
 * having CORS headers omitted.
 * @param {string[]} allowedOrigins
 * @returns {import('express').RequestHandler[]}
 */
export function restrictedCors(allowedOrigins) {
  const rejectForeignOrigins = (req, _res, next) =>
    isOriginAllowed(req, allowedOrigins)
      ? next()
      : next(
          new HttpError(403, 'Requests from this origin are not allowed.', {
            code: 'ORIGIN_FORBIDDEN',
          }),
        );

  const corsHandler = cors((req, cb) =>
    cb(null, {
      origin: isOriginAllowed(req, allowedOrigins),
      methods: ['GET', 'POST'],
      maxAge: 600,
    }),
  );
  return [rejectForeignOrigins, corsHandler];
}

/**
 * @param {{ windowMs: number, limit: number, message: string }} options
 * @returns {import('express').RequestHandler} rate-limiting middleware
 */
export function createRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });
}
