import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, getAirQuality, getPlan } from './client.js';
import { jsonResponse, mockFetch } from '../test/utils.jsx';
import { translate } from '../i18n/I18nContext.jsx';

const t = (key) => translate('en', key);

describe('api client', () => {
  it('builds query strings safely', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }));
    await getAirQuality(28.6, 77.2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/air-quality?lat=28.6&lon=77.2');
  });

  it('posts JSON', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ plan: {} }));
    await getPlan({ a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });

  it('turns server errors into ApiError with the safe message', async () => {
    mockFetch(() =>
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Bad input.' } }, 400),
    );
    const err = await getPlan({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Bad input.' });
  });

  it('handles non-JSON error bodies', async () => {
    mockFetch(() => Promise.resolve(new Response('Bad gateway', { status: 502 })));
    const err = await getPlan({}).catch((e) => e);
    expect(errorMessage(err, t)).toBe('Something went wrong. Please try again.');
  });

  it('maps network failures to a friendly message', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const err = await getPlan({}).catch((e) => e);
    expect(errorMessage(err, t)).toMatch(/can't reach the server/i);
  });

  it('re-throws aborts untouched', async () => {
    mockFetch(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    await expect(getPlan({})).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(errorMessage(new Error('internal'), t)).toBe('Something went wrong. Please try again.');
  });
});
