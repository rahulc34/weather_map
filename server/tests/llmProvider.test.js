import { describe, expect, it, vi } from 'vitest';
import { GEMINI_API_VERSION, createGeminiProvider } from '../src/services/llm/geminiProvider.js';
import { createLlmProvider } from '../src/services/llm/index.js';

describe('createLlmProvider', () => {
  it('returns null without an API key', () => {
    expect(
      createLlmProvider({ apiKey: '', model: 'gemini-2.5-flash', timeoutMs: 1000 }),
    ).toBeNull();
  });

  it('returns a Gemini provider with a key', () => {
    const provider = createLlmProvider({ apiKey: 'k', model: 'gemini-2.5-flash', timeoutMs: 1000 });
    expect(provider.name).toBe('gemini:gemini-2.5-flash');
  });

  it('targets the v1beta API (required for system instructions + JSON schema)', () => {
    expect(GEMINI_API_VERSION).toBe('v1beta');
  });
});

describe('geminiProvider.generateJson', () => {
  it('requests structured JSON output with the system instruction', async () => {
    const generateContent = vi.fn(async () => ({ text: '{"ok":true}' }));
    const provider = createGeminiProvider({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      timeoutMs: 1000,
      client: { models: { generateContent } },
    });
    const schema = { type: 'object' };
    const text = await provider.generateJson({
      systemInstruction: 'rules',
      contents: 'data',
      jsonSchema: schema,
    });

    expect(text).toBe('{"ok":true}');
    const req = generateContent.mock.calls[0][0];
    expect(req.model).toBe('gemini-2.5-flash');
    expect(req.contents).toBe('data');
    expect(req.config).toMatchObject({
      systemInstruction: 'rules',
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(req.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('does not force a thinking budget on other models', async () => {
    const generateContent = vi.fn(async () => ({ text: '{}' }));
    const provider = createGeminiProvider({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      timeoutMs: 1000,
      client: { models: { generateContent } },
    });
    await provider.generateJson({ systemInstruction: 's', contents: 'c', jsonSchema: {} });
    expect(generateContent.mock.calls[0][0].config.thinkingConfig).toBeUndefined();
  });
});
