/**
 * Express application factory. Dependencies are injectable so tests can
 * replace OpenWeather / Gemini with fakes (no network in tests).
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { createApiRouter } from './routes/api.js';
import {
  createRateLimiter,
  permissionsPolicy,
  restrictedCors,
  securityHeaders,
} from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createAirQualityService } from './services/airQualityService.js';
import { createAssistantService } from './services/assistantService.js';
import { createLlmProvider } from './services/llm/index.js';

const DEFAULT_CLIENT_DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist',
);

/**
 * Wire the real services from configuration.
 * @param {ReturnType<typeof import('./config/index.js').loadConfig>} config
 * @returns {{ airQualityService: ReturnType<typeof createAirQualityService>, assistantService: ReturnType<typeof createAssistantService> }} services
 */
export function createServices(config) {
  const { airQualityTtlMs, geocodeTtlMs, aiTtlMs, maxEntries } = config.cache;
  const airQualityService = createAirQualityService({
    ...config.openWeather,
    ttlMs: airQualityTtlMs,
    geocodeTtlMs,
    maxEntries,
  });
  const assistantService = createAssistantService({
    llm: createLlmProvider(config.gemini),
    airQualityService,
    ttlMs: aiTtlMs,
    maxEntries,
  });
  return { airQualityService, assistantService };
}

/**
 * Mount the JSON API with CORS, rate limits and a small body limit.
 * @param {import('express').Express} app
 * @param {ReturnType<typeof import('./config/index.js').loadConfig>} config
 * @param {ReturnType<typeof createServices>} services
 */
function mountApi(app, config, services) {
  const { windowMs, max, aiMax } = config.rateLimit;
  const apiLimiter = createRateLimiter({
    windowMs,
    limit: max,
    message: 'Too many requests. Please wait a few minutes and try again.',
  });
  const aiLimiter = createRateLimiter({
    windowMs,
    limit: aiMax,
    message: 'You have reached the AI request limit. Please try again in a few minutes.',
  });
  app.use(
    '/api',
    ...restrictedCors(config.cors.allowedOrigins),
    apiLimiter,
    express.json({ limit: '10kb' }),
    createApiRouter({ ...services, aiLimiter }),
  );
  app.use('/api', notFound);
}

/**
 * Serve the built React app: hashed assets cached forever, SPA fallback to index.html.
 * @param {import('express').Express} app
 * @param {string} clientDist path to the Vite build output
 */
function mountClient(app, clientDist) {
  if (!existsSync(clientDist)) return;
  app.use(
    '/assets',
    express.static(path.join(clientDist, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
    }),
  );
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.set('Cache-Control', 'no-cache').sendFile(path.join(clientDist, 'index.html'));
  });
}

/**
 * Build the Express application.
 * @param {{
 *   config: ReturnType<typeof import('./config/index.js').loadConfig>,
 *   services?: ReturnType<typeof createServices>,
 *   clientDist?: string,
 * }} options
 * @returns {import('express').Express} configured app (not yet listening)
 */
export function createApp({
  config,
  services = createServices(config),
  clientDist = DEFAULT_CLIENT_DIST,
}) {
  const app = express();
  app.disable('x-powered-by');
  // Render (and most PaaS) terminate TLS at a single proxy hop.
  app.set('trust proxy', 1);
  app.use(securityHeaders(), permissionsPolicy, compression());

  mountApi(app, config, services);
  mountClient(app, clientDist); // single deployable service

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
