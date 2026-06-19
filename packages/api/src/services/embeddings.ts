import { createTtlCache, HttpError, withRetry } from "../lib/resilience";
import { hashString, mulberry32 } from "./_hash";

export const EMBEDDING_DIM = 768;
export const EMBEDDING_MODEL = "clip-embeddings";

// Embeddings are immutable per image — cache to avoid re-embedding on retries/dupes.
const embedCache = createTtlCache<number[]>({
  ttlMs: 24 * 60 * 60 * 1000,
  max: 2000,
});

/** L2-normalize a vector (so cosine == inner product, matching pgvector usage). */
export function l2normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Deterministic 768-dim unit vector from a seed — used as a dev fallback so the
 *  duplicate/similarity engine works end-to-end without a Replicate key. */
export function deterministicEmbedding(seed: string): number[] {
  const rnd = mulberry32(hashString(seed));
  const v = Array.from({ length: EMBEDDING_DIM }, () => rnd() * 2 - 1);
  return l2normalize(v);
}

export interface EmbeddingService {
  isReal: boolean;
  embed(imageUrl: string): Promise<number[]>;
}

type ReplicatePrediction = {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: { embedding?: number[] } | number[] | number[][] | null;
  urls?: { get?: string };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull the 768-dim vector out of either output shape the model may return. */
function parseEmbedding(out: ReplicatePrediction["output"]): number[] {
  return Array.isArray(out)
    ? Array.isArray(out[0])
      ? (out[0] as number[])
      : (out as number[])
    : (out?.embedding ?? []);
}

export function getEmbeddingService(): EmbeddingService {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_FASHION_EMBED_VERSION;

  if (!token || !version) {
    return {
      isReal: false,
      embed: async (imageUrl) => deterministicEmbedding(imageUrl),
    };
  }

  return {
    isReal: true,
    async embed(imageUrl) {
      const cached = embedCache.get(imageUrl);
      if (cached) return cached;
      // CLIP image embedding via Replicate (768-dim, matches pgvector column).
      // Async create + poll — NOT `Prefer: wait`, whose synchronous path is
      // tightly rate-limited (429 under bulk capture). Plain create + GET poll
      // succeeds even at ratelimit-remaining:0.
      const vec = await withRetry(
        async () => {
          // Create, honoring the create endpoint's rate limit (free tiers allow
          // ~1 per ratelimit-reset window → 429 under bulk; wait it out, but
          // bounded so latency stays near real-time).
          let createRes: Response | null = null;
          for (let attempt = 0; attempt < 4; attempt++) {
            const res = await fetch(
              "https://api.replicate.com/v1/predictions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ version, input: { image: imageUrl } }),
              },
            );
            if (res.status === 429) {
              // honor numeric reset only — an HTTP-date Retry-After parses to
              // NaN and must not collapse to a 0ms busy-loop.
              const reset = Number(res.headers.get("ratelimit-reset"));
              const wait =
                Number.isFinite(reset) && reset > 0 ? Math.min(reset + 1, 10) : 2;
              await sleep(wait * 1000);
              continue;
            }
            createRes = res;
            break;
          }
          if (!createRes) throw new HttpError("Replicate rate limited", 429);
          if (!createRes.ok) {
            throw new HttpError("Replicate embed failed", createRes.status);
          }
          let pred = (await createRes.json()) as ReplicatePrediction;
          const getUrl = pred.urls?.get;

          // Poll briskly — clip-embeddings resolves in ~2–4s. Terminal/timeout
          // throw 4xx-class HttpErrors so withRetry does NOT re-run them (a
          // genuinely failed prediction or timeout shouldn't restack minutes).
          const deadline = Date.now() + 30_000;
          while (
            pred.status !== "succeeded" &&
            pred.status !== "failed" &&
            pred.status !== "canceled"
          ) {
            if (!getUrl) throw new HttpError("Replicate: no poll URL", 422);
            if (Date.now() > deadline) {
              throw new HttpError("Replicate embed timeout", 422);
            }
            await sleep(800);
            const g = await fetch(getUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!g.ok) throw new HttpError("Replicate poll failed", g.status);
            pred = (await g.json()) as ReplicatePrediction;
          }
          if (pred.status !== "succeeded") {
            throw new HttpError(`Replicate embed ${pred.status}`, 422);
          }
          const raw = parseEmbedding(pred.output);
          if (!raw.length) {
            throw new HttpError("Replicate returned no embedding", 422);
          }
          return l2normalize(raw);
        },
        // fail fast: one quick retry for transient blips, no long restacking
        { retries: 1, baseMs: 150, maxMs: 1000 },
      );
      embedCache.set(imageUrl, vec);
      return vec;
    },
  };
}
