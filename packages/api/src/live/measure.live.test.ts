import { describe, it } from "vitest";
import { sql } from "drizzle-orm";
import { closets, garments, getDb } from "@closet/db";
import { getTaggingService } from "../services/tagging";
import { getEmbeddingService } from "../services/embeddings";
import { getWeatherService } from "../services/weather";
import { llmModel, llmProvider } from "../services/llm";

/**
 * Real latency measurement against live services + DB. Opt-in:
 *   set -a; source .env; set +a
 *   RUN_MEASURE=1 pnpm exec vitest run measure.live
 * Prints ms per operation so we stop guessing.
 */
const LIVE = process.env.RUN_MEASURE === "1";
const IMG =
  process.env.LIVE_IMG_A ??
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600";

async function time(label: string, fn: () => Promise<unknown>) {
  const t = performance.now();
  try {
    await fn();
    console.log(`  ${label.padEnd(34)} ${Math.round(performance.now() - t)}ms`);
  } catch (e) {
    console.log(
      `  ${label.padEnd(34)} FAILED ${Math.round(performance.now() - t)}ms — ${
        (e as Error).message
      }`,
    );
  }
}

describe.skipIf(!LIVE)("latency measurement (real services + DB)", () => {
  it("times each operation", async () => {
    const db = getDb();
    const emb = getEmbeddingService();
    const tag = getTaggingService();
    console.log(
      `\n  [env] embed=${emb.isReal} tag=${tag.isReal} llm=${llmProvider()}/${llmModel()}\n`,
    );

    console.log("  — DATABASE (Supabase pooler, Seoul) —");
    await time("DB connect + count garments", () =>
      db.select({ n: sql<number>`count(*)::int` }).from(garments),
    );
    await time("DB count garments (warm)", () =>
      db.select({ n: sql<number>`count(*)::int` }).from(garments),
    );
    await time("DB select closets (warm)", () =>
      db.select().from(closets).limit(50),
    );

    console.log("  — EXTERNAL AI / APIs —");
    await time("Weather forecast (기상청)", () =>
      getWeatherService().forecast(37.5665, 126.978),
    );
    await time("Tagging (OpenAI vision)", () => tag.tag(IMG));
    await time("Embedding (Replicate CLIP)", () => emb.embed(IMG));
    console.log("");
  }, 180_000);
});
