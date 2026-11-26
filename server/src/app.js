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
 */
export function createServices(config) {
  const airQualityService = createAirQualityService({
    ...config.openWeather,
    ttlMs: config.cache.airQualityTtlMs,
    geocodeTtlMs: config.cache.geocodeTtlMs,
    maxEntries: config.cache.maxEntries,
  });
  const assistantService = createAssistantService({
    llm: createLlmProvider(config.gemini),
    airQualityService,
    ttlMs: config.cache.aiTtlMs,
    maxEntries: config.cache.maxEntries,
  });
  return { airQualityService, assistantService };
}

/**
 * @param {{
 *   config: ReturnType<typeof import('./config/index.js').loadConfig>,
 *   services?: ReturnType<typeof createServices>,
 *   clientDist?: string,
 * }} options
 * @returns {import('express').Express}
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

  app.use(securityHeaders());
  app.use(permissionsPolicy);
  app.use(compression());

  const apiLimiter = createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    message: 'Too many requests. Please wait a few minutes and try again.',
  });
  const aiLimiter = createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.aiMax,
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

  // Serve the built React app (single deployable service).
  if (existsSync(clientDist)) {
    app.use(
      '/assets',
      express.static(path.join(clientDist, 'assets'), {
        immutable: true,
        maxAge: '1y',
        index: false,
      }),
    );
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    // SPA fallback: any other GET returns index.html.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache').sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
