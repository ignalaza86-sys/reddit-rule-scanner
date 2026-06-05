/**
 * In-memory cache with TTL support for the Reddit Rule Scanner app.
 *
 * Features:
 * - Generic get/set/delete/has methods
 * - Per-entry TTL with auto-expiry
 * - Default TTLs per data type (rules: 24h, search: 1h, trends: 6h)
 * - Automatic cleanup of expired entries every 5 minutes
 * - Thread-safe singleton pattern for Next.js hot reloads
 */

// ── Default TTLs per data type ──────────────────────────────────────────────
export const CACHE_TTL = {
  rules: 24 * 60 * 60 * 1000,   // 24 hours
  search: 1 * 60 * 60 * 1000,   // 1 hour
  trends: 6 * 60 * 60 * 1000,   // 6 hours
  default: 5 * 60 * 1000,       // 5 minutes
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;

// ── Internal cache entry ────────────────────────────────────────────────────
interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp in ms
}

// ── Cache class ─────────────────────────────────────────────────────────────
class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private static CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startCleanup();
  }

  // ── Core operations ─────────────────────────────────────────────────────

  /**
   * Get a cached value by key. Returns `undefined` if the key doesn't exist
   * or has expired (expired entries are lazily removed on read).
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a cached value with an optional TTL.
   * @param key   Cache key
   * @param value Value to store
   * @param ttl   Time-to-live in milliseconds (defaults to CACHE_TTL.default)
   */
  set<T>(key: string, value: T, ttl: number = CACHE_TTL.default): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Delete a cached entry. Returns `true` if the entry existed.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Check whether a non-expired entry exists for the given key.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  // ── Convenience helpers ─────────────────────────────────────────────────

  /**
   * Get-or-set pattern: return cached value if it exists, otherwise call
   * `fetcher`, store the result with the given TTL, and return it.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.default,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete all entries whose key starts with the given prefix.
   * Useful for invalidating a namespace (e.g. all rule caches).
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Return the number of entries currently in the cache (including potentially
   * expired ones that haven't been cleaned up yet).
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  /**
   * Remove all expired entries from the cache.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Start the automatic cleanup interval.
   */
  private startCleanup(): void {
    // Prevent duplicate timers (important during Next.js hot reloads)
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, MemoryCache.CLEANUP_INTERVAL);

    // Allow the Node.js process to exit even if the timer is still running
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the automatic cleanup interval (useful for tests or teardown).
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// ── Singleton export ────────────────────────────────────────────────────────
// Use the global object to persist the cache across Next.js hot reloads in dev.

const globalForCache = globalThis as unknown as {
  __memoryCache: MemoryCache | undefined;
};

export const cache: MemoryCache =
  globalForCache.__memoryCache ?? new MemoryCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.__memoryCache = cache;
}
