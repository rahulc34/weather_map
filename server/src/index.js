/**
 * Server entry point.
 */
import { loadConfig } from './config/index.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const config = loadConfig();

if (!config.gemini.apiKey)
  logger.warn('GEMINI_API_KEY is not set — AI features will use basic fallback guidance.');
if (!config.openWeather.apiKey)
  logger.warn('OPENWEATHER_API_KEY is not set — live AQI will be unavailable.');

const server = createApp({ config }).listen(config.port, () => {
  logger.info('SmogSense server listening', { port: config.port, env: config.env });
});

/**
 * Graceful shutdown for platform restarts / deploys.
 * @param {string} signal the OS signal that triggered shutdown
 */
function shutdown(signal) {
  logger.info('Shutting down', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
