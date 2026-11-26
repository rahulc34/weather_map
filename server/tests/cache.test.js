import { describe, expect, it, vi } from 'vitest';
import { TtlLruCache } from '../src/utils/cache.js';

describe('TtlLruCache', () => {
  it('stores and returns values', () => {
    const cache = new TtlLruCache({ ttlMs: 1000 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after the TTL', () => {
    let now = 0;
    const cache = new TtlLruCache({ ttlMs: 100, now: () => now });
    cache.set('a', 1);
    now = 99;
    expect(cache.get('a')).toBe(1);
    now = 100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least-recently-used entry when full', () => {
    const cache = new TtlLruCache({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // a is now most recent
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('getOrSet computes once and de-duplicates concurrent calls', async () => {
    const cache = new TtlLruCache({ ttlMs: 1000 });
    const producer = vi.fn(async () => 'value');
    const [x, y] = await Promise.all([
      cache.getOrSet('k', producer),
      cache.getOrSet('k', producer),
    ]);
    expect(x).toBe('value');
    expect(y).toBe('value');
    expect(await cache.getOrSet('k', producer)).toBe('value');
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = new TtlLruCache({ ttlMs: 1000 });
    await expect(
      cache.getOrSet('k', async () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(await cache.getOrSet('k', async () => 'ok')).toBe('ok');
  });

  it('rejects an invalid TTL', () => {
    expect(() => new TtlLruCache({ ttlMs: 0 })).toThrow(TypeError);
  });

  it('clear() empties the cache', () => {
    const cache = new TtlLruCache({ ttlMs: 1000 });
    cache.set('a', 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
