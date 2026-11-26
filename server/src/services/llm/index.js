/**
 * LLM provider factory. The rest of the app depends only on the
 * `LlmProvider` interface, so Gemini can be swapped for another provider by
 * adding a module here — no route or service changes required.
 */
import { createGeminiProvider } from './geminiProvider.js';

/**
 * @typedef {object} GenerateJsonRequest
 * @property {string} systemInstruction fixed rules (never contains user text)
 * @property {string} contents user-data block
 * @property {object} jsonSchema JSON Schema the response must follow
 * @property {number} [temperature]
 *
 * @typedef {object} LlmProvider
 * @property {string} name
 * @property {(req: GenerateJsonRequest) => Promise<string | undefined>} generateJson
 *   returns the raw JSON text produced by the model
 */

/**
 * @param {{ apiKey: string, model: string, timeoutMs: number }} geminiConfig
 * @returns {LlmProvider | null} null when no API key is configured
 */
export function createLlmProvider(geminiConfig) {
  if (!geminiConfig.apiKey) return null;
  return createGeminiProvider(geminiConfig);
}
