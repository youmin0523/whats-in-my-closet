import { describe, expect, it } from "vitest";
import {
  createTtlCache,
  defaultShouldRetry,
  HttpError,
  mapWithConcurrency,
  withRetry,
} from "./resilience";

describe("withRetry", () => {
  const noSleep = () => Promise.resolve();

  it("retries until success and returns the value", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { sleep: noSleep, jitter: false },
    );
    expect(r).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after `retries` and throws the last error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`fail-${calls}`);
        },
        { retries: 2, sleep: noSleep, jitter: false },
      ),
    ).rejects.toThrow("fail-3");
    expect(calls).toBe(3); // first + 2 retries
  });

  it("uses exponential backoff delays", async () => {
    const delays: number[] = [];
    await withRetry(async () => Promise.reject(new Error("x")), {
      retries: 3,
      baseMs: 100,
      factor: 2,
      jitter: false,
      sleep: async (ms) => void delays.push(ms),
    }).catch(() => {});
    expect(delays).toEqual([100, 200, 400]);
  });

  it("does not retry non-retryable HTTP (4xx)", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new HttpError("bad request", 400);
        },
        { sleep: noSleep, jitter: false },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("retries retryable HTTP (429/5xx)", () => {
    expect(defaultShouldRetry(new HttpError("rate", 429))).toBe(true);
    expect(defaultShouldRetry(new HttpError("server", 503))).toBe(true);
    expect(defaultShouldRetry(new HttpError("client", 404))).toBe(false);
    expect(defaultShouldRetry(new Error("network"))).toBe(true);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      await Promise.resolve();
      inFlight -= 1;
      return x * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("handles empty input", async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([]);
  });
});

describe("createTtlCache", () => {
  it("caches and reuses values", async () => {
    let made = 0;
    const cache = createTtlCache<number>();
    const make = async () => {
      made += 1;
      return 42;
    };
    expect(await cache.getOrSet("k", make)).toBe(42);
    expect(await cache.getOrSet("k", make)).toBe(42);
    expect(made).toBe(1);
    expect(cache.size()).toBe(1);
  });

  it("expires entries after the TTL", async () => {
    let t = 1000;
    const cache = createTtlCache<string>({ ttlMs: 100, now: () => t });
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
    t += 101;
    expect(cache.get("k")).toBeUndefined();
  });

  it("dedupes concurrent identical work (single-flight)", async () => {
    let made = 0;
    const cache = createTtlCache<number>();
    const make = () =>
      new Promise<number>((res) => {
        made += 1;
        setTimeout(() => res(7), 5);
      });
    const [a, b] = await Promise.all([
      cache.getOrSet("same", make),
      cache.getOrSet("same", make),
    ]);
    expect(a).toBe(7);
    expect(b).toBe(7);
    expect(made).toBe(1);
  });

  it("evicts oldest beyond max", () => {
    const cache = createTtlCache<number>({ max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size()).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });
});
