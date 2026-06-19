import { describe, expect, it } from "vitest";
import { getTaggingService } from "../services/tagging";
import { EMBEDDING_DIM, getEmbeddingService } from "../services/embeddings";
import { llmModel, llmProvider } from "../services/llm";
import { cosineSimilarity, duplicateScoreNoColor } from "../lib/scoring";

/**
 * Live, opt-in verification of the external AI pipeline with REAL keys.
 * Skipped by default (so `pnpm test` stays hermetic). Run it with:
 *
 *   RUN_LIVE=1 pnpm --filter @closet/api exec vitest run verify.live
 *
 * Required env: OPENAI_API_KEY (or ANTHROPIC_API_KEY) · REPLICATE_API_TOKEN +
 * REPLICATE_FASHION_EMBED_VERSION. Optionally override the sample images with
 * LIVE_IMG_A/B (two SIMILAR garments) and LIVE_IMG_C (a DIFFERENT one) — public
 * URLs. This is the flagship proof: real embeddings → cosine → duplicate score,
 * where the similar pair must rank above the unrelated pair.
 */
const LIVE = process.env.RUN_LIVE === "1";

// A & B = the SAME garment photo (near-duplicate — the "이미 비슷한 옷 보유"
// case), C = a clearly different item. Override with your own for a richer test.
const IMG_A =
  process.env.LIVE_IMG_A ??
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600";
const IMG_B =
  process.env.LIVE_IMG_B ??
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=420";
const IMG_C =
  process.env.LIVE_IMG_C ??
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600";

describe.skipIf(!LIVE)("live AI pipeline (real keys)", () => {
  it("tagging returns structured garment tags", async () => {
    const svc = getTaggingService();
    console.log(
      `[tag] isReal=${svc.isReal} provider=${llmProvider()} model=${llmModel()}`,
    );
    expect(svc.isReal, "set OPENAI_API_KEY or ANTHROPIC_API_KEY").toBe(true);

    const tags = await svc.tag(IMG_A);
    console.log("[tag]", JSON.stringify(tags));
    expect(tags.category).toBeTruthy();
  }, 60_000);

  it("embeddings are 768-dim and rank similar > different (→ duplicate score)", async () => {
    const svc = getEmbeddingService();
    console.log(`[embed] isReal=${svc.isReal}`);
    expect(
      svc.isReal,
      "set REPLICATE_API_TOKEN + REPLICATE_FASHION_EMBED_VERSION",
    ).toBe(true);

    // Sequential, not Promise.all — Replicate low tiers throttle concurrent
    // predictions (429). One at a time is slower but reliable.
    const a = await svc.embed(IMG_A);
    const b = await svc.embed(IMG_B);
    const c = await svc.embed(IMG_C);
    expect(a).toHaveLength(EMBEDDING_DIM);

    const simAB = cosineSimilarity(a, b);
    const simAC = cosineSimilarity(a, c);
    console.log(
      `[embed] cos(A,B)=${simAB.toFixed(3)} cos(A,C)=${simAC.toFixed(3)}`,
    );
    // The flagship invariant: two similar garments are closer than an unrelated one.
    expect(simAB).toBeGreaterThan(simAC);

    const dup = duplicateScoreNoColor({
      embeddingCosine: simAB,
      sameSubcategory: true,
      sameCategory: true,
    });
    console.log(`[score] A~B duplicate=${dup.score} (${dup.verdict})`);
    expect(dup.score).toBeGreaterThan(0);
  }, 120_000);
});
