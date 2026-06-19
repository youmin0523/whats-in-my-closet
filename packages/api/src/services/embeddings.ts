import { createTtlCache, HttpError, withRetry } from "../lib/resilience";
import { hashString, mulberry32 } from "./_hash";

export const EMBEDDING_DIM = 768;
export const EMBEDDING_MODEL = "marqo-fashionSigLIP";

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
      // Marqo-FashionSigLIP image embedding via Replicate.
      const vec = await withRetry(async () => {
        const res = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({ version, input: { image: imageUrl } }),
        });
        if (!res.ok) {
          throw new HttpError("Replicate embed failed", res.status);
        }
        const json = (await res.json()) as { output: number[] | number[][] };
        const out = json.output;
        return l2normalize(
          Array.isArray(out[0]) ? (out[0] as number[]) : (out as number[]),
        );
      });
      embedCache.set(imageUrl, vec);
      return vec;
    },
  };
}
