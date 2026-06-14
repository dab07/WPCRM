const WINDOW_SECONDS = 60;
const MAX_REQUESTS   = 10;
const MAX_ENTRIES    = 10_000; // LRU eviction cap

// Simple LRU: Map insertion order + delete-on-read-then-reinsert
const store = new Map<string, number>();

function evictIfNeeded(): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(uid: string, nowMs: number = Date.now()): RateLimitResult {
  try {
    const windowStart = Math.floor(nowMs / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
    const key = `${uid}:${windowStart}`;
    const count = store.get(key) ?? 0;

    if (count >= MAX_REQUESTS) {
      const windowEnd = windowStart + WINDOW_SECONDS;
      return { allowed: false, retryAfterSeconds: windowEnd - Math.floor(nowMs / 1000) };
    }

    evictIfNeeded();
    store.set(key, count + 1);
    // Move to end for LRU ordering
    const val = store.get(key)!;
    store.delete(key);
    store.set(key, val);

    return { allowed: true };
  } catch (err) {
    // Fail-open: store unavailability must not block requests
    console.warn('[RateLimiter] store error — failing open:', err);
    return { allowed: true };
  }
}
