/**
 * Minimal structured logger. Emits one JSON line per entry so logs are
 * machine-readable on Render. Never pass secrets or full upstream URLs here.
 */
const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

/** Tests stay silent; everywhere else logs info and above. */
const MIN_LEVEL = process.env.NODE_ENV === 'test' ? LEVELS.error + 1 : LEVELS.info;

/**
 * Write one log entry if its level is enabled.
 * @param {keyof typeof LEVELS} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta] extra structured fields
 */
function write(level, message, meta = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...meta });
  if (LEVELS[level] >= LEVELS.warn) console.error(line);
  else console.log(line);
}

/**
 * Create a logging function bound to one level.
 * @param {keyof typeof LEVELS} level
 * @returns {(message: string, meta?: Record<string, unknown>) => void} logging function
 */
const forLevel = (level) => (message, meta) => write(level, message, meta);

/** Application logger: `logger.info('message', { key: value })`. */
export const logger = Object.freeze({
  debug: forLevel('debug'),
  info: forLevel('info'),
  warn: forLevel('warn'),
  error: forLevel('error'),
});
