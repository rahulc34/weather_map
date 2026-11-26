/**
 * Minimal structured logger. Emits one JSON line per entry so logs are
 * machine-readable on Render. Never pass secrets or full upstream URLs here.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel = process.env.NODE_ENV === 'test' ? LEVELS.error + 1 : LEVELS.info;

/**
 * @param {keyof LEVELS} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function write(level, message, meta = {}) {
  if (LEVELS[level] < minLevel) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...meta });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};
