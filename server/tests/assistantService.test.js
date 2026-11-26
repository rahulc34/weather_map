import { describe, expect, it, vi } from 'vitest';
import { cacheKey, createAssistantService } from '../src/services/assistantService.js';
import { buildFallbackPlan } from '../src/services/fallbackPlan.js';
import { planResponseSchema } from '../src/utils/aiSchemas.js';
import { sampleReport, validPlan, validProfile } from './fixtures.js';

const input = (overrides = {}) => ({
  lat: 28.61,
  lon: 77.21,
  lang: 'en',
  timeZone: 'Asia/Kolkata',
  profile: validProfile(),
  ...overrides,
});

const makeLlm = (response) => ({
  name: 'fake',
  generateJson: vi.fn(async () => (typeof response === 'function' ? response() : response)),
});

const makeService = ({ llm, report = sampleReport() } = {}) =>
  createAssistantService({
    llm,
    airQualityService: {
      getReport: vi.fn(async () => {
        if (report instanceof Error) throw report;
        return report;
      }),
    },
    ttlMs: 60_000,
  });

describe('assistantService.generatePlan', () => {
  it('returns a validated AI plan and passes the JSON schema to the provider', async () => {
    const llm = makeLlm(JSON.stringify(validPlan()));
    const result = await makeService({ llm }).generatePlan(input());
    expect(result.source).toBe('ai');
    expect(result.airQualityAvailable).toBe(true);
    expect(result.plan.summary).toContain('very poor');
    const call = llm.generateJson.mock.calls[0][0];
    expect(call.jsonSchema.required).toContain('dailyRoutine');
    expect(call.contents).toContain('<user_data>');
  });

  it('caches identical requests', async () => {
    const llm = makeLlm(JSON.stringify(validPlan()));
    const service = makeService({ llm });
    await service.generatePlan(input());
    await service.generatePlan(input());
    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    await service.generatePlan(input({ lang: 'hi' }));
    expect(llm.generateJson).toHaveBeenCalledTimes(2);
  });

  it('falls back when the model returns invalid JSON', async () => {
    const result = await makeService({ llm: makeLlm('not json') }).generatePlan(input());
    expect(result.source).toBe('fallback');
    expect(planResponseSchema.safeParse(result.plan).success).toBe(true);
  });

  it('falls back when the provider throws', async () => {
    const llm = makeLlm(() => {
      throw new Error('quota exceeded');
    });
    expect((await makeService({ llm }).generatePlan(input())).source).toBe('fallback');
  });

  it('falls back when no provider is configured', async () => {
    expect((await makeService({ llm: null }).generatePlan(input())).source).toBe('fallback');
  });

  it('still generates a plan when AQI is unavailable', async () => {
    const llm = makeLlm(JSON.stringify(validPlan()));
    const result = await makeService({ llm, report: new Error('down') }).generatePlan(input());
    expect(result.airQualityAvailable).toBe(false);
    expect(result.source).toBe('ai');
  });
});

describe('assistantService.answerQuestion', () => {
  it('returns a validated answer', async () => {
    const llm = makeLlm(JSON.stringify({ answer: 'Better at 2 pm.', safetyNote: '' }));
    const result = await makeService({ llm }).answerQuestion({
      ...input(),
      question: 'Can my kid play at 5pm?',
      history: [],
    });
    expect(result).toEqual({ answer: 'Better at 2 pm.', safetyNote: '', source: 'ai' });
  });

  it('falls back in the requested language', async () => {
    const result = await makeService({ llm: null }).answerQuestion({
      ...input({ lang: 'hi' }),
      question: 'क्या?',
      history: [],
    });
    expect(result.source).toBe('fallback');
    expect(result.answer).toMatch(/[ऀ-ॿ]/);
  });
});

describe('buildFallbackPlan', () => {
  it('is schema-valid in both languages and tailored to the profile', () => {
    for (const lang of ['en', 'hi']) {
      const plan = buildFallbackPlan({
        airQuality: sampleReport(1),
        profile: { ...validProfile(), household: {}, cookingFuel: 'biomass', hasAirPurifier: true },
        lang,
      });
      expect(planResponseSchema.safeParse(plan).success).toBe(true);
      expect(plan.sustainableAlternatives).toHaveLength(3);
      expect(plan.urgentPrecautions).toEqual([]);
    }
  });

  it('adds urgent precautions for severe air', () => {
    const plan = buildFallbackPlan({
      airQuality: sampleReport(5),
      profile: { household: {} },
      lang: 'en',
    });
    expect(plan.urgentPrecautions.length).toBeGreaterThan(0);
  });
});

describe('cacheKey', () => {
  it('is deterministic and order-sensitive to content', () => {
    expect(cacheKey('a', { x: 1 })).toBe(cacheKey('a', { x: 1 }));
    expect(cacheKey('a', { x: 1 })).not.toBe(cacheKey('a', { x: 2 }));
  });
});
