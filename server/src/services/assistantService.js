/**
 * Orchestrates the GenAI features: personalised plan and chat follow-ups.
 *
 * Both features share one pipeline, described by a task descriptor:
 *   live AQI (server-side, cached) → prompt builder → LLM (structured JSON)
 *   → schema validation → cache. Any LLM failure degrades to rule-based
 *   guidance that is clearly labelled as such.
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
 * @typedef {import('./airQualityMappers.js').AirQualityReport} AirQualityReport
 * @typedef {{ lat: number, lon: number, locationName?: string, lang: 'en'|'hi', timeZone: string, profile: object }} AssistantInput
 * @typedef {AssistantInput & { question: string, history: { role: string, text: string }[] }} ChatInput
 * @typedef {AssistantInput & { airQuality: AirQualityReport | null }} AssistantContext
 *
 * @typedef {object} AssistantTask
 * @property {string} name cache-key namespace
 * @property {(ctx: AssistantContext) => { systemInstruction: string, contents: string }} buildPrompt
 * @property {object} jsonSchema schema sent to the model
 * @property {import('zod').ZodType} responseSchema schema the reply must pass
 * @property {(ctx: AssistantContext) => object} fallback rule-based answer
 * @property {(input: AssistantInput) => object} [extraKeyParts] request-specific cache-key fields
 */

/** @type {AssistantTask} */
const PLAN_TASK = Object.freeze({
  name: 'plan',
  buildPrompt: buildPlanPrompt,
  jsonSchema: PLAN_JSON_SCHEMA,
  responseSchema: planResponseSchema,
  fallback: buildFallbackPlan,
});

/** @type {AssistantTask} */
const CHAT_TASK = Object.freeze({
  name: 'chat',
  buildPrompt: buildChatPrompt,
  jsonSchema: CHAT_JSON_SCHEMA,
  responseSchema: chatResponseSchema,
  fallback: (ctx) => buildFallbackChat(ctx.lang),
  extraKeyParts: (/** @type {ChatInput} */ input) => ({
    question: input.question.toLowerCase(),
    history: input.history,
  }),
});

/**
 * Stable cache key for a request. Uses the AQI observation time rather than
 * the wall clock, so identical requests within the AQI cache window hit.
 * @param {string} kind
 * @param {object} parts
 * @returns {string} namespaced SHA-256 key
 */
export function cacheKey(kind, parts) {
  return `${kind}:${createHash('sha256').update(JSON.stringify(parts)).digest('hex')}`;
}

/**
 * Cache key for one task + context.
 * @param {AssistantTask} task
 * @param {AssistantContext} ctx
 * @returns {string} cache key
 */
function taskCacheKey(task, ctx) {
  const { airQuality } = ctx;
  return cacheKey(task.name, {
    aq: airQuality ? [airQuality.location, airQuality.observedAt] : null,
    profile: ctx.profile,
    lang: ctx.lang,
    tz: ctx.timeZone,
    locationName: ctx.locationName,
    ...(task.extraKeyParts?.(ctx) ?? {}),
  });
}

/**
 * @param {{
 *   llm: import('./llm/index.js').LlmProvider | null,
 *   airQualityService: { getReport: (lat: number, lon: number) => Promise<AirQualityReport> },
 *   ttlMs: number,
 *   maxEntries?: number,
 * }} deps
 * @returns {{ generatePlan: (input: AssistantInput) => Promise<object>, answerQuestion: (input: ChatInput) => Promise<object> }} service
 */
export function createAssistantService({ llm, airQualityService, ttlMs, maxEntries = 500 }) {
  const cache = new TtlLruCache({ ttlMs, maxEntries });

  /**
   * Add live AQI (or null if unavailable — never blocks the assistant).
   * @param {AssistantInput} input
   * @returns {Promise<AssistantContext>} context for prompts
   */
  async function buildContext(input) {
    const airQuality = await airQualityService.getReport(input.lat, input.lon).catch((err) => {
      logger.warn('AQI unavailable for assistant; continuing without it', { code: err?.code });
      return null;
    });
    const locationName = input.locationName || airQuality?.location.name || undefined;
    return { ...input, locationName, airQuality };
  }

  /**
   * Run one task through the LLM, validating the reply; fall back on any failure.
   * @param {AssistantTask} task
   * @param {AssistantInput} input
   * @returns {Promise<{ data: object, source: 'ai' | 'fallback', ctx: AssistantContext }>} result
   */
  async function runTask(task, input) {
    const ctx = await buildContext(input);
    if (!llm) return { data: task.fallback(ctx), source: 'fallback', ctx };
    try {
      const data = await cache.getOrSet(taskCacheKey(task, ctx), async () => {
        const raw = await llm.generateJson({
          ...task.buildPrompt(ctx),
          jsonSchema: task.jsonSchema,
        });
        return parseModelJson(raw, task.responseSchema);
      });
      return { data, source: 'ai', ctx };
    } catch (err) {
      logger.error('LLM generation failed; serving fallback', {
        provider: llm.name,
        reason: err?.message,
      });
      return { data: task.fallback(ctx), source: 'fallback', ctx };
    }
  }

  return {
    /**
     * Personalised daily plan.
     * @param {AssistantInput} input
     * @returns {Promise<object>} plan, its source and whether live AQI was used
     */
    async generatePlan(input) {
      const { data, source, ctx } = await runTask(PLAN_TASK, input);
      return {
        plan: data,
        source,
        airQualityAvailable: Boolean(ctx.airQuality),
        generatedAt: new Date().toISOString(),
      };
    },

    /**
     * Answer a follow-up question with AQI + profile as context.
     * @param {ChatInput} input
     * @returns {Promise<object>} answer, safety note and source
     */
    async answerQuestion(input) {
      const { data, source } = await runTask(CHAT_TASK, input);
      return { ...data, source };
    },
  };
}
