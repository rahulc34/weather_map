/**
 * Integration tests for the HTTP API (Supertest). External services are fakes:
 * no network calls are made.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import { createAirQualityService } from '../src/services/airQualityService.js';
import { createAssistantService } from '../src/services/assistantService.js';
import {
  fakeFetch,
  owmCurrent,
  owmForecast,
  owmGeocode,
  owmReverse,
  validPlan,
  validProfile,
} from './fixtures.js';

const owmRoutes = () => ({
  '/data/2.5/air_pollution': () => owmCurrent(),
  '/data/2.5/air_pollution/forecast': () => owmForecast(),
  '/geo/1.0/direct': () => owmGeocode(),
  '/geo/1.0/reverse': () => owmReverse(),
});

/**
 * Build an app wired with real services but fake fetch + fake LLM.
 */
function buildApp({
  routes = owmRoutes(),
  llmText = JSON.stringify(validPlan()),
  env = {},
  clientDist,
} = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ...env });
  const airQualityService = createAirQualityService({
    apiKey: 'test-key',
    baseUrl: 'https://api.openweathermap.org',
    timeoutMs: 1000,
    ttlMs: 60_000,
    geocodeTtlMs: 60_000,
    fetchImpl: fakeFetch(routes),
  });
  const llm = { name: 'fake', generateJson: vi.fn(async () => llmText) };
  const assistantService = createAssistantService({ llm, airQualityService, ttlMs: 60_000 });
  return {
    app: createApp({
      config,
      services: { airQualityService, assistantService },
      clientDist: clientDist ?? '/nonexistent',
    }),
    llm,
  };
}

const planBody = (overrides = {}) => ({
  lat: 28.61,
  lon: 77.21,
  lang: 'en',
  timeZone: 'Asia/Kolkata',
  profile: validProfile(),
  ...overrides,
});

describe('GET /api/health', () => {
  it('returns ok with security headers', async () => {
    const res = await request(buildApp().app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['permissions-policy']).toContain('geolocation=(self)');
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });
});

describe('GET /api/geocode', () => {
  it('returns matching cities', async () => {
    const res = await request(buildApp().app).get('/api/geocode').query({ q: 'Delhi' });
    expect(res.status).toBe(200);
    expect(res.body.results[0]).toMatchObject({ name: 'Delhi', country: 'IN' });
  });

  it('rejects invalid queries with 400', async () => {
    const res = await request(buildApp().app).get('/api/geocode').query({ q: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/air-quality', () => {
  it('returns a live AQI report', async () => {
    const res = await request(buildApp().app)
      .get('/api/air-quality')
      .query({ lat: 28.61, lon: 77.21 });
    expect(res.status).toBe(200);
    expect(res.body.aqi.category.key).toBe('very_poor');
    expect(res.headers['cache-control']).toContain('max-age=300');
  });

  it.each([[{ lat: 100, lon: 0 }], [{ lat: 0, lon: -200 }], [{ lat: 'x', lon: 1 }], [{}]])(
    'rejects bad coordinates %j',
    async (query) => {
      const res = await request(buildApp().app).get('/api/air-quality').query(query);
      expect(res.status).toBe(400);
    },
  );

  it('returns a clear 503 when OpenWeather is down', async () => {
    const { app } = buildApp({
      routes: { ...owmRoutes(), '/data/2.5/air_pollution': () => new Error('down') },
    });
    const res = await request(app).get('/api/air-quality').query({ lat: 1, lon: 1 });
    expect(res.status).toBe(503);
    expect(res.body.error.message).toMatch(/temporarily unavailable/);
    expect(JSON.stringify(res.body)).not.toContain('test-key');
  });
});

describe('POST /api/plan', () => {
  it('returns an AI-generated plan', async () => {
    const res = await request(buildApp().app).post('/api/plan').send(planBody());
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('ai');
    expect(res.body.plan.dailyRoutine.length).toBeGreaterThan(0);
  });

  it('returns fallback guidance when the model misbehaves', async () => {
    const res = await request(buildApp({ llmText: '<b>hacked</b>' }).app)
      .post('/api/plan')
      .send(planBody());
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(JSON.stringify(res.body)).not.toContain('hacked');
  });

  it('rejects unknown fields and bad enums', async () => {
    const app = buildApp().app;
    expect(
      (
        await request(app)
          .post('/api/plan')
          .send(planBody({ admin: true }))
      ).status,
    ).toBe(400);
    const badProfile = { ...validProfile(), commute: 'teleport' };
    expect(
      (
        await request(app)
          .post('/api/plan')
          .send(planBody({ profile: badProfile }))
      ).status,
    ).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const res = await request(buildApp().app)
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send('{"lat":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects oversized bodies', async () => {
    const res = await request(buildApp().app)
      .post('/api/plan')
      .send(planBody({ profile: { ...validProfile(), notes: 'x'.repeat(20_000) } }));
    expect(res.status).toBe(413);
  });
});

describe('POST /api/chat', () => {
  it('answers a follow-up question', async () => {
    const { app } = buildApp({
      llmText: JSON.stringify({ answer: 'Play between 1–3 pm.', safetyNote: '' }),
    });
    const res = await request(app)
      .post('/api/chat')
      .send({ ...planBody(), question: 'Can my kid play outside at 5pm?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Play between 1–3 pm.');
  });

  it('rejects an empty question', async () => {
    const res = await request(buildApp().app)
      .post('/api/chat')
      .send({ ...planBody(), question: '' });
    expect(res.status).toBe(400);
  });
});

describe('CORS & origin restrictions', () => {
  it('allows the configured dev origin', async () => {
    const res = await request(buildApp().app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('allows same-origin requests', async () => {
    const res = await request(buildApp().app)
      .post('/api/plan')
      .set('Host', 'smogsense.example')
      .set('Origin', 'http://smogsense.example')
      .send(planBody());
    expect(res.status).toBe(200);
  });

  it('rejects foreign origins with 403', async () => {
    const res = await request(buildApp().app)
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('limits AI endpoints more strictly', async () => {
    const { app, llm } = buildApp({ env: { AI_RATE_LIMIT_MAX: '2' } });
    await request(app).post('/api/plan').send(planBody());
    await request(app).post('/api/plan').send(planBody());
    const res = await request(app).post('/api/plan').send(planBody());
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(llm.generateJson).toHaveBeenCalledTimes(1); // second call served from cache
  });
});

describe('errors & static hosting', () => {
  let dist;
  beforeEach(() => {
    dist = mkdtempSync(path.join(tmpdir(), 'smogsense-dist-'));
    mkdirSync(path.join(dist, 'assets'));
    writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>SmogSense</title>');
    writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(buildApp().app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('serves the SPA and long-caches hashed assets', async () => {
    const { app } = buildApp({ clientDist: dist });
    const page = await request(app).get('/some/client/route');
    expect(page.status).toBe(200);
    expect(page.text).toContain('SmogSense');
    expect(page.headers['cache-control']).toBe('no-cache');
    const asset = await request(app).get('/assets/app-abc123.js');
    expect(asset.headers['cache-control']).toContain('immutable');
  });

  it('hides internal error details', async () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    const services = {
      airQualityService: {
        getReport: async () => {
          throw new Error('secret internal detail');
        },
        searchCities: async () => [],
      },
      assistantService: {},
    };
    const app = createApp({ config, services, clientDist: '/nonexistent' });
    const res = await request(app).get('/api/air-quality').query({ lat: 1, lon: 1 });
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
