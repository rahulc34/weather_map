/**
 * JSON API routes. Handlers are thin: validate → call service → respond.
 * Express 5 forwards rejected promises to the error handler automatically.
 */
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  chatRequestSchema,
  coordinatesSchema,
  geocodeQuerySchema,
  planRequestSchema,
} from '../utils/validation.js';

/**
 * @param {{
 *   airQualityService: ReturnType<typeof import('../services/airQualityService.js').createAirQualityService>,
 *   assistantService: ReturnType<typeof import('../services/assistantService.js').createAssistantService>,
 *   aiLimiter: import('express').RequestHandler,
 * }} deps
 */
export function createApiRouter({ airQualityService, assistantService, aiLimiter }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  });

  router.get('/geocode', validate(geocodeQuerySchema, 'query'), async (_req, res) => {
    const results = await airQualityService.searchCities(res.locals.input.q);
    res.set('Cache-Control', 'private, max-age=3600').json({ results });
  });

  router.get('/air-quality', validate(coordinatesSchema, 'query'), async (_req, res) => {
    const { lat, lon } = res.locals.input;
    const report = await airQualityService.getReport(lat, lon);
    res.set('Cache-Control', 'private, max-age=300').json(report);
  });

  router.post('/plan', aiLimiter, validate(planRequestSchema), async (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(await assistantService.generatePlan(res.locals.input));
  });

  router.post('/chat', aiLimiter, validate(chatRequestSchema), async (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(await assistantService.answerQuestion(res.locals.input));
  });

  return router;
}
