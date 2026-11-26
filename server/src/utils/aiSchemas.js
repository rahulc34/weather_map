/**
 * Structured-output contracts for the LLM.
 *
 *  - `*_JSON_SCHEMA` is sent to Gemini (`responseJsonSchema`) to constrain generation.
 *  - The matching zod schema re-validates the response on our side, because a
 *    model's output must never be trusted blindly.
 */
import { z } from 'zod';
import { CONFIDENCE_LEVELS, IMPACT_TYPES } from '@smogsense/shared';
import { summarizeIssues } from './zodIssues.js';

const MAX_ITEMS = 6;
const MAX_URGENT_ITEMS = 5;

const suggestionJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short action-oriented title (max 80 chars).' },
    details: { type: 'string', description: 'What to do and how, 1–3 sentences.' },
    timing: { type: 'string', description: 'When to do it (e.g. "2–4 pm"), or empty string.' },
    impact: {
      type: 'object',
      properties: {
        reduces: { type: 'string', enum: IMPACT_TYPES },
        explanation: {
          type: 'string',
          description: 'Plain-language explanation of the direct effect of this choice.',
        },
        estimate: {
          type: 'string',
          description:
            'Approximate, honestly-labelled quantitative estimate (e.g. "~30–50% lower PM2.5 indoors"), or "Not quantifiable".',
        },
        confidence: { type: 'string', enum: CONFIDENCE_LEVELS },
      },
      required: ['reduces', 'explanation', 'estimate', 'confidence'],
    },
  },
  required: ['title', 'details', 'timing', 'impact'],
};

const suggestionList = {
  type: 'array',
  items: suggestionJsonSchema,
  minItems: 2,
  maxItems: MAX_ITEMS,
};

/** JSON Schema sent to Gemini for the personalised plan. */
export const PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2–3 sentence overview for this household today.' },
    urgentPrecautions: {
      type: 'array',
      items: { type: 'string' },
      maxItems: MAX_URGENT_ITEMS,
      description: 'Only for very poor/severe air or vulnerable members; otherwise empty.',
    },
    dailyRoutine: suggestionList,
    indoorHacks: suggestionList,
    sustainableAlternatives: suggestionList,
  },
  required: [
    'summary',
    'urgentPrecautions',
    'dailyRoutine',
    'indoorHacks',
    'sustainableAlternatives',
  ],
  propertyOrdering: [
    'summary',
    'urgentPrecautions',
    'dailyRoutine',
    'indoorHacks',
    'sustainableAlternatives',
  ],
};

/** JSON Schema sent to Gemini for chat answers. */
export const CHAT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Direct, practical answer (max ~120 words).' },
    safetyNote: {
      type: 'string',
      description: 'Short health-safety note if relevant, otherwise empty string.',
    },
  },
  required: ['answer', 'safetyNote'],
};

const text = (max) => z.string().trim().min(1).max(max);

const suggestionSchema = z.object({
  title: text(120),
  details: text(600),
  timing: z.string().trim().max(80).default(''),
  impact: z.object({
    reduces: z.enum([...IMPACT_TYPES]),
    explanation: text(400),
    estimate: text(160),
    confidence: z.enum([...CONFIDENCE_LEVELS]),
  }),
});

const suggestionArray = z
  .array(suggestionSchema)
  .min(1)
  .transform((a) => a.slice(0, MAX_ITEMS));

export const planResponseSchema = z.object({
  summary: text(800),
  urgentPrecautions: z
    .array(text(300))
    .default([])
    .transform((a) => a.slice(0, MAX_URGENT_ITEMS)),
  dailyRoutine: suggestionArray,
  indoorHacks: suggestionArray,
  sustainableAlternatives: suggestionArray,
});

export const chatResponseSchema = z.object({
  answer: text(1500),
  safetyNote: z.string().trim().max(400).default(''),
});

/**
 * Parse raw model text into validated data.
 * Tolerates accidental markdown code fences around the JSON.
 * @template T
 * @param {string | undefined} raw model output
 * @param {z.ZodType<T>} schema
 * @returns {T} the validated data
 * @throws {Error} when the output is not valid JSON or fails the schema
 */
export function parseModelJson(raw, schema) {
  if (typeof raw !== 'string' || raw.trim() === '') throw new Error('Empty model response');
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('Model response is not valid JSON');
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const paths = summarizeIssues(result.error)
      .map((issue) => issue.field)
      .join(', ');
    throw new Error(`Model response failed schema validation at: ${paths}`);
  }
  return result.data;
}
