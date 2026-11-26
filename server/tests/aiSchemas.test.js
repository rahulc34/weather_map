import { describe, expect, it } from 'vitest';
import {
  PLAN_JSON_SCHEMA,
  chatResponseSchema,
  parseModelJson,
  planResponseSchema,
} from '../src/utils/aiSchemas.js';
import { validPlan } from './fixtures.js';

describe('parseModelJson', () => {
  it('parses a valid plan', () => {
    const plan = parseModelJson(JSON.stringify(validPlan()), planResponseSchema);
    expect(plan.dailyRoutine).toHaveLength(2);
  });

  it('tolerates markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify({ answer: 'Yes', safetyNote: '' }) + '\n```';
    expect(parseModelJson(raw, chatResponseSchema).answer).toBe('Yes');
  });

  it('rejects empty output', () => {
    expect(() => parseModelJson('', chatResponseSchema)).toThrow('Empty');
    expect(() => parseModelJson(undefined, chatResponseSchema)).toThrow('Empty');
  });

  it('rejects non-JSON output', () => {
    expect(() => parseModelJson('<script>alert(1)</script>', chatResponseSchema)).toThrow(
      'not valid JSON',
    );
  });

  it('rejects output that breaks the schema', () => {
    const bad = validPlan();
    bad.dailyRoutine[0].impact.reduces = 'everything';
    expect(() => parseModelJson(JSON.stringify(bad), planResponseSchema)).toThrow(/dailyRoutine/);
  });

  it('rejects a suggestion without impact', () => {
    const bad = validPlan();
    delete bad.indoorHacks[0].impact;
    expect(() => parseModelJson(JSON.stringify(bad), planResponseSchema)).toThrow(/indoorHacks/);
  });

  it('truncates over-long arrays rather than failing', () => {
    const plan = validPlan();
    plan.indoorHacks = Array.from({ length: 9 }, () => plan.indoorHacks[0]);
    plan.urgentPrecautions = Array.from({ length: 8 }, () => 'Stay in');
    const parsed = parseModelJson(JSON.stringify(plan), planResponseSchema);
    expect(parsed.indoorHacks).toHaveLength(6);
    expect(parsed.urgentPrecautions).toHaveLength(5);
  });

  it('defaults optional fields', () => {
    const plan = validPlan();
    delete plan.urgentPrecautions;
    delete plan.dailyRoutine[0].timing;
    const parsed = parseModelJson(JSON.stringify(plan), planResponseSchema);
    expect(parsed.urgentPrecautions).toEqual([]);
    expect(parsed.dailyRoutine[0].timing).toBe('');
  });
});

describe('PLAN_JSON_SCHEMA', () => {
  it('requires all three plan sections', () => {
    expect(PLAN_JSON_SCHEMA.required).toEqual(
      expect.arrayContaining(['dailyRoutine', 'indoorHacks', 'sustainableAlternatives']),
    );
  });
});
