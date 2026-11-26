/**
 * Request validation schemas (zod). Everything that comes from the client is
 * parsed here; route handlers only ever see validated, typed data.
 */
import { z } from 'zod';

/** Limits shared with the client-side form (kept small on purpose). */
export const LIMITS = Object.freeze({
  cityQuery: 80,
  notes: 300,
  question: 500,
  historyItems: 6,
  historyText: 1000,
});

/**
 * Strip control characters and the angle brackets we use as prompt delimiters,
 * collapse whitespace and trim. Applied to every free-text field.
 * @param {string} value
 * @returns {string}
 */
export function sanitizeText(value) {
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const safeText = (max) =>
  z
    .string()
    .max(max * 2)
    .transform(sanitizeText)
    .pipe(z.string().max(max));

/** Valid IANA time zone, falling back to UTC for anything unknown. */
const timeZone = z
  .string()
  .max(64)
  .optional()
  .transform((tz) => {
    if (!tz) return 'UTC';
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return tz;
    } catch {
      return 'UTC';
    }
  });

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const geocodeQuerySchema = z.object({
  q: safeText(LIMITS.cityQuery).pipe(z.string().min(2, 'Enter at least 2 characters')),
});

export const languageSchema = z.enum(['en', 'hi']).default('en');

export const profileSchema = z
  .object({
    household: z
      .object({
        children: z.boolean().default(false),
        elderly: z.boolean().default(false),
        respiratory: z.boolean().default(false),
        heart: z.boolean().default(false),
        pregnant: z.boolean().default(false),
      })
      .strict()
      // prefault (not default) so the inner field defaults are applied too.
      .prefault({}),
    commute: z
      .enum(['walk', 'cycle', 'two_wheeler', 'car', 'public_transport', 'none'])
      .default('none'),
    cookingFuel: z.enum(['lpg', 'piped_gas', 'electric', 'biomass', 'kerosene']).default('lpg'),
    heating: z.enum(['none', 'electric', 'gas', 'wood_coal', 'heat_pump']).default('none'),
    hasAirPurifier: z.boolean().default(false),
    hasPlants: z.boolean().default(false),
    worksFromHome: z.boolean().default(false),
    notes: safeText(LIMITS.notes).default(''),
  })
  .strict();

const locationName = safeText(120).optional();

export const planRequestSchema = z
  .object({
    lat: coordinatesSchema.shape.lat,
    lon: coordinatesSchema.shape.lon,
    locationName,
    lang: languageSchema,
    timeZone,
    profile: profileSchema,
  })
  .strict();

export const chatRequestSchema = z
  .object({
    lat: coordinatesSchema.shape.lat,
    lon: coordinatesSchema.shape.lon,
    locationName,
    lang: languageSchema,
    timeZone,
    profile: profileSchema,
    question: safeText(LIMITS.question).pipe(z.string().min(2, 'Question is too short')),
    history: z
      .array(
        z
          .object({ role: z.enum(['user', 'assistant']), text: safeText(LIMITS.historyText) })
          .strict(),
      )
      .max(LIMITS.historyItems)
      .default([]),
  })
  .strict();
