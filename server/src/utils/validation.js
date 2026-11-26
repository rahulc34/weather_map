/**
 * Request validation schemas (zod). Everything that comes from the client is
 * parsed here; route handlers only ever see validated, typed data.
 * Allowed values and limits come from the shared package, so the client form
 * and the server can never disagree.
 */
import { z } from 'zod';
import {
  COMMUTE_MODES,
  COOKING_FUELS,
  DEFAULT_PROFILE,
  EQUIPMENT_FLAGS,
  HEATING_TYPES,
  HOUSEHOLD_MEMBERS,
  LANGUAGES,
  LIMITS,
} from '@smogsense/shared';

const MIN_TEXT_LENGTH = 2;

/**
 * Strip control characters and the angle brackets we use as prompt delimiters,
 * collapse whitespace and trim. Applied to every free-text field.
 * @param {string} value
 * @returns {string} sanitised text
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

/**
 * Free text that is sanitised, then length-checked.
 * @param {number} max maximum length after sanitising
 * @returns {z.ZodType<string>} schema
 */
const safeText = (max) =>
  z
    .string()
    .max(max * 2)
    .transform(sanitizeText)
    .pipe(z.string().max(max));

/**
 * Whether a string is a time zone the runtime recognises.
 * @param {string} tz
 * @returns {boolean} true for valid IANA zones
 */
function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Valid IANA time zone, falling back to UTC for anything unknown. */
const timeZoneSchema = z
  .string()
  .max(64)
  .optional()
  .transform((tz) => (tz && isValidTimeZone(tz) ? tz : 'UTC'));

const booleanFlags = (keys, defaults) =>
  Object.fromEntries(keys.map((key) => [key, z.boolean().default(defaults[key])]));

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const geocodeQuerySchema = z.object({
  q: safeText(LIMITS.cityQuery).pipe(
    z.string().min(MIN_TEXT_LENGTH, 'Enter at least 2 characters'),
  ),
});

export const languageSchema = z.enum([...LANGUAGES]).default('en');

export const profileSchema = z
  .object({
    household: z
      .object(booleanFlags(HOUSEHOLD_MEMBERS, DEFAULT_PROFILE.household))
      .strict()
      // prefault (not default) so the inner field defaults are applied too.
      .prefault({}),
    commute: z.enum([...COMMUTE_MODES]).default(DEFAULT_PROFILE.commute),
    cookingFuel: z.enum([...COOKING_FUELS]).default(DEFAULT_PROFILE.cookingFuel),
    heating: z.enum([...HEATING_TYPES]).default(DEFAULT_PROFILE.heating),
    ...booleanFlags(EQUIPMENT_FLAGS, DEFAULT_PROFILE),
    notes: safeText(LIMITS.notes).default(''),
  })
  .strict();

/** Fields shared by every AI request: where, who, and in which language. */
const assistantContextShape = {
  lat: coordinatesSchema.shape.lat,
  lon: coordinatesSchema.shape.lon,
  locationName: safeText(LIMITS.locationName).optional(),
  lang: languageSchema,
  timeZone: timeZoneSchema,
  profile: profileSchema,
};

const chatTurnSchema = z
  .object({ role: z.enum(['user', 'assistant']), text: safeText(LIMITS.historyText) })
  .strict();

export const planRequestSchema = z.object(assistantContextShape).strict();

export const chatRequestSchema = z
  .object({
    ...assistantContextShape,
    question: safeText(LIMITS.question).pipe(
      z.string().min(MIN_TEXT_LENGTH, 'Question is too short'),
    ),
    history: z.array(chatTurnSchema).max(LIMITS.historyItems).default([]),
  })
  .strict();
