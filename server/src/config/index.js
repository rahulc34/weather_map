/**
 * Centralised, validated runtime configuration.
 * Every environment variable the server reads goes through this module.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  GEMINI_API_KEY: z.string().trim().optional().default(''),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-2.5-flash'),
  OPENWEATHER_API_KEY: z.string().trim().optional().default(''),
  /** Comma-separated list of extra origins allowed by CORS (e.g. the Vite dev server). */
  ALLOWED_ORIGINS: z.string().optional().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

/**
 * Parse and freeze configuration from an env-like object.
 * @param {Record<string, string | undefined>} env
 * @returns {Readonly<ReturnType<typeof buildConfig>>}
 */
export function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Only report which keys are invalid — never echo their values.
    const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  return Object.freeze(buildConfig(parsed.data));
}

/** @param {z.infer<typeof envSchema>} e */
function buildConfig(e) {
  const devOrigins = e.NODE_ENV === 'production' ? [] : ['http://localhost:5173'];
  const extraOrigins = e.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    port: e.PORT,
    gemini: { apiKey: e.GEMINI_API_KEY, model: e.GEMINI_MODEL, timeoutMs: 25_000 },
    openWeather: {
      apiKey: e.OPENWEATHER_API_KEY,
      baseUrl: 'https://api.openweathermap.org',
      timeoutMs: 8_000,
    },
    cors: { allowedOrigins: [...devOrigins, ...extraOrigins] },
    rateLimit: {
      windowMs: e.RATE_LIMIT_WINDOW_MS,
      max: e.RATE_LIMIT_MAX,
      aiMax: e.AI_RATE_LIMIT_MAX,
    },
    cache: {
      airQualityTtlMs: 10 * 60 * 1000,
      geocodeTtlMs: 24 * 60 * 60 * 1000,
      aiTtlMs: 15 * 60 * 1000,
      maxEntries: 500,
    },
  };
}
