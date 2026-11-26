import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/index.js';

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(8080);
    expect(config.gemini.model).toBe('gemini-2.5-flash');
    expect(config.cors.allowedOrigins).toContain('http://localhost:5173');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('does not allow the dev origin in production', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://a.example, https://b.example',
    });
    expect(config.cors.allowedOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('throws on invalid values without echoing them', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow(/PORT/);
    expect(() => loadConfig({ NODE_ENV: 'secret-value' })).not.toThrow(/secret-value/);
  });
});
