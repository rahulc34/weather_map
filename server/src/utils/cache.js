/**
 * Tiny in-memory LRU cache with per-entry TTL and in-flight request
 * de-duplication. Map preserves insertion order, so the first key is
 * always the least-recently-used one.
 */
export class TtlLruCache {
  /**
   * @param {{ maxEntries?: number, ttlMs: number, now?: () => number }} options
   */
  constructor({ maxEntries = 500, ttlMs, now = Date.now }) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new TypeError('ttlMs must be > 0');
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    this.store = new Map();
    /** @type {Map<string, Promise<unknown>>} */
    this.inFlight = new Map();
  }

  /**
   * @param {string} key
   * @returns {unknown | undefined} cached value, or undefined if missing/expired
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @param {number} [ttlMs] override the default TTL
   */
  set(key, value, ttlMs = this.ttlMs) {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }

  /**
   * Return the cached value or compute it once. Concurrent callers for the
   * same key share a single in-flight promise. Failures are not cached.
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} producer
   * @returns {Promise<T>}
   */
  async getOrSet(key, producer) {
    const cached = this.get(key);
    if (cached !== undefined) return /** @type {T} */ (cached);
    const pending = this.inFlight.get(key);
    if (pending) return /** @type {Promise<T>} */ (pending);

    const promise = (async () => {
      try {
        const value = await producer();
        this.set(key, value);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }

  /** @returns {number} number of live entries (including not-yet-evicted expired ones) */
  get size() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
    this.inFlight.clear();
  }
}
