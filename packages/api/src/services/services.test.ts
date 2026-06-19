import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cosineSimilarity } from "../lib/scoring";
import {
  EMBEDDING_DIM,
  deterministicEmbedding,
  getEmbeddingService,
} from "./embeddings";
import { getTaggingService } from "./tagging";
import { getDetectionService } from "./detection";

// Force the keyless dev fallbacks regardless of the host machine's env.
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("REPLICATE_API_TOKEN", "");
  vi.stubEnv("REPLICATE_FASHION_EMBED_VERSION", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("embeddings (dev fallback)", () => {
  it("is deterministic, L2-normalized, correct dimension", () => {
    const a = deterministicEmbedding("https://x/img1.jpg");
    const b = deterministicEmbedding("https://x/img1.jpg");
    expect(a).toHaveLength(EMBEDDING_DIM);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("same image → cosine 1, different images → < 1", () => {
    const a = deterministicEmbedding("img1");
    const c = deterministicEmbedding("img2");
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 6);
    expect(cosineSimilarity(a, c)).toBeLessThan(0.99);
  });

  it("service uses the fallback without a key", async () => {
    const svc = getEmbeddingService();
    expect(svc.isReal).toBe(false);
    expect(await svc.embed("img1")).toHaveLength(EMBEDDING_DIM);
  });
});

describe("tagging / detection (dev fallback)", () => {
  it("tagging returns a valid shape", async () => {
    const svc = getTaggingService();
    expect(svc.isReal).toBe(false);
    const t = await svc.tag("img");
    expect(typeof t.category).toBe("string");
    expect(Array.isArray(t.colors)).toBe(true);
  });

  it("detection falls back to a whole-image item", async () => {
    const svc = getDetectionService();
    expect(svc.isReal).toBe(false);
    const d = await svc.detect("img");
    expect(d).toHaveLength(1);
    expect(d[0]?.bbox).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});
