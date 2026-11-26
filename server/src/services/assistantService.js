/**
 * Orchestrates the GenAI features: personalised plan and chat follow-ups.
 *
 * Flow: live AQI (server-side, cached) → prompt builder → LLM (structured JSON)
 *       → schema validation → cache. Any LLM failure degrades to rule-based
 *       guidance that is clearly labelled as such.
 */
import { createHash } from 'node:crypto';
import { TtlLruCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import {
  CHAT_JSON_SCHEMA,
  PLAN_JSON_SCHEMA,
  chatResponseSchema,
  parseModelJson,
  planResponseSchema,
} from '../utils/aiSchemas.js';
import { buildChatPrompt, buildPlanPrompt } from './promptBuilder.js';
import { buildFallbackChat, buildFallbackPlan } from './fallbackPlan.js';

/**
 * Stable cache key for a request. Uses the AQI observation time rather than
 * the wall clock, so identical requests within the AQI cache window hit.
 * @param {string} kind
 * @param {object} parts
 */
export function cacheKey(kind, parts) {
  return `${kind}:${createHash('sha256').update(JSON.stringify(parts)).digest('hex')}`;
}

/**
 * @param {{
 *   llm: import('./llm/index.js').LlmProvider | null,
 *   airQualityService: { getReport: (lat: number, lon: number) => Promise<import('./airQualityService.js').AirQualityReport> },
 *   ttlMs: number,
 *   maxEntries?: number,
 * }} deps
 */
export function createAssistantService({ llm, airQualityService, ttlMs, maxEntries = 500 }) {
  const cache = new TtlLruCache({ ttlMs, maxEntries });

  /**
   * Fetch AQI, but never let an AQI outage block the assistant.
   * @param {number} lat
   * @param {number} lon
   */
  async function safeReport(lat, lon) {
    try {
      return await airQualityService.getReport(lat, lon);
    } catch (err) {
      logger.warn('AQI unavailable for assistant; continuing without it', { code: err?.code });
      return null;
    }
  }

  /**
   * Call the LLM and validate its JSON, falling back on any failure.
   * @template T
   * @param {string} key
   * @param {{ systemInstruction: string, contents: string }} prompt
   * @param {object} jsonSchema
   * @param {import('zod').ZodType<T>} schema
   * @param {() => T} fallback
   * @returns {Promise<{ data: T, source: 'ai' | 'fallback' }>}
   */
  async function generate(key, prompt, jsonSchema, schema, fallback) {
    if (!llm) return { data: fallback(), source: 'fallback' };
    try {
      const data = await cache.getOrSet(key, async () =>
        parseModelJson(await llm.generateJson({ ...prompt, jsonSchema }), schema),
      );
      return { data, source: 'ai' };
    } catch (err) {
      logger.error('LLM generation failed; serving fallback', {
        provider: llm.name,
        reason: err?.message,
      });
      return { data: fallback(), source: 'fallback' };
    }
  }

  /**
   * Personalised daily plan.
   * @param {{ lat: number, lon: number, locationName?: string, lang: 'en'|'hi', timeZone: string, profile: object }} input
   */
  async function generatePlan(input) {
    const airQuality = await safeReport(input.lat, input.lon);
    const locationName = input.locationName || airQuality?.location.name || undefined;
    const ctx = { ...input, locationName, airQuality };
    const key = cacheKey('plan', {
      aq: airQuality ? [airQuality.location, airQuality.observedAt] : null,
      profile: input.profile,
      lang: input.lang,
      tz: input.timeZone,
      locationName,
    });
    const { data, source } = await generate(
      key,
      buildPlanPrompt(ctx),
      PLAN_JSON_SCHEMA,
      planResponseSchema,
      () => buildFallbackPlan(ctx),
    );
    return {
      plan: data,
      source,
      airQualityAvailable: Boolean(airQuality),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Answer a follow-up question with AQI + profile as context.
   * @param {{ lat: number, lon: number, locationName?: string, lang: 'en'|'hi', timeZone: string, profile: object, question: string, history: { role: string, text: string }[] }} input
   */
  async function answerQuestion(input) {
    const airQuality = await safeReport(input.lat, input.lon);
    const locationName = input.locationName || airQuality?.location.name || undefined;
    const ctx = { ...input, locationName, airQuality };
    const key = cacheKey('chat', {
      aq: airQuality ? [airQuality.location, airQuality.observedAt] : null,
      profile: input.profile,
      lang: input.lang,
      tz: input.timeZone,
      question: input.question.toLowerCase(),
      history: input.history,
    });
    const { data, source } = await generate(
      key,
      buildChatPrompt(ctx),
      CHAT_JSON_SCHEMA,
      chatResponseSchema,
      () => buildFallbackChat(input.lang),
    );
    return { ...data, source };
  }

  return { generatePlan, answerQuestion };
}
