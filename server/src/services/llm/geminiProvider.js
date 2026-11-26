/**
 * Google Gemini implementation of the LLM provider interface.
 * Uses structured output (responseMimeType + responseJsonSchema).
 */
import { GoogleGenAI } from '@google/genai';

export const GEMINI_API_VERSION = 'v1beta';

/**
 * @param {{ apiKey: string, model: string, timeoutMs: number, client?: { models: { generateContent: (request: object) => Promise<{ text?: string }> } } }} options
 *   `client` can be injected for testing.
 * @returns {import('./index.js').LlmProvider}
 */
export function createGeminiProvider({ apiKey, model, timeoutMs, client }) {
  // System instructions + JSON-schema output require the v1beta API surface.
  const ai = client ?? new GoogleGenAI({ apiKey, apiVersion: GEMINI_API_VERSION });

  return {
    name: `gemini:${model}`,
    async generateJson({ systemInstruction, contents, jsonSchema, temperature = 0.4 }) {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
          // Gemini 2.5 Flash "thinks" by default; disabling it keeps latency low and
          // stays well inside the free tier. Other models keep their defaults.
          ...(model.startsWith('gemini-2.5-flash')
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
      return response.text;
    },
  };
}
