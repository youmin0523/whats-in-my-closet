/**
 * Operational hardening for external calls (AI/model/HTTP) — production-readiness
 * that every env-gated service can share: exponential-backoff retry, bounded
 * concurrency, and a single-flight TTL cache. Pure & deterministic (timers/clock
 * are injectable), so it's golden-tested with no real waiting.
 */

/** HTTP error carrying a status, so retry can distinguish 4xx (don't) from 5xx/429 (do). */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(`${message} (${status})`);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Retry on network errors, 408, 429, and 5xx; skip other 4xx (client errors). */
export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status === 408 || err.status === 429 || err.status >= 500;
  }
  return true;
}

export interface RetryOptions {
  retries?: number; // additional attempts after the first (default 3)
  baseMs?: number; // first backoff (default 200)
  factor?: number; // backoff multiplier (default 2)
  maxMs?: number; // backoff ceiling (default 5000)
  jitter?: boolean; // randomize backoff ±50% (default true)
  shouldRetry?: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>; // injectable for tests
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 200;
  const factor = opts.factor ?? 2;
  const maxMs = opts.maxMs ?? 5000;
  const jitter = opts.jitter ?? true;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;
  const sleep = opts.sleep ?? realSleep;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err)) break;
      const backoff = Math.min(maxMs, baseMs * factor ** attempt);
      const delay = jitter
        ? Math.round(backoff * (0.5 + Math.random() * 0.5))
        : backoff;
      opts.onRetry?.(attempt + 1, err, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Run an async fn over items with at most `limit` in flight — prevents a bulk
 * action from firing N concurrent model calls (rate-limit / cost blow-ups).
 * Order-preserving.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const n = Math.max(1, Math.min(Math.floor(limit) || 1, items.length || 1));
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  /** Cache-hit → return; else run `make` once (deduping concurrent callers). */
  getOrSet(key: string, make: () => Promise<V>): Promise<V>;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

export interface TtlCacheOptions {
  ttlMs?: number; // entry lifetime (default 1h)
  max?: number; // max entries, FIFO eviction (default 500)
  now?: () => number; // injectable clock for tests
}

export function createTtlCache<V>(opts: TtlCacheOptions = {}): TtlCache<V> {
  const ttlMs = opts.ttlMs ?? 60 * 60 * 1000;
  const max = opts.max ?? 500;
  const now = opts.now ?? Date.now;
  const store = new Map<string, { v: V; exp: number }>();
  const inflight = new Map<string, Promise<V>>();

  const evictIfNeeded = () => {
    while (store.size > max) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  const get = (key: string): V | undefined => {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.exp <= now()) {
      store.delete(key);
      return undefined;
    }
    return hit.v;
  };

  const set = (key: string, value: V) => {
    store.set(key, { v: value, exp: now() + ttlMs });
    evictIfNeeded();
  };

  return {
    get,
    set,
    delete: (key) => void store.delete(key),
    clear: () => {
      store.clear();
      inflight.clear();
    },
    size: () => store.size,
    async getOrSet(key, make) {
      const hit = get(key);
      if (hit !== undefined) return hit;
      const pending = inflight.get(key);
      if (pending) return pending;
      const p = make()
        .then((v) => {
          set(key, v);
          inflight.delete(key);
          return v;
        })
        .catch((e) => {
          inflight.delete(key);
          throw e;
        });
      inflight.set(key, p);
      return p;
    },
  };
}
