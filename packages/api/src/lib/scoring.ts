/**
 * Duplicate / similarity scoring — the core of the #1 differentiator
 * ("이미 비슷한 옷 있음"). Pure functions, fully unit-tested.
 *
 * score = 100 · (0.6·simEmb + 0.25·simColor + 0.15·simCat)
 *   simEmb   = (cosine + 1) / 2                     (fashion-embedding similarity)
 *   simColor = 1 − ΔE00 / 40                        (dominant-color similarity)
 *   simCat   = 1 (same subcategory) / 0.6 (same category) / 0
 */
import { colorSimilarity, type Lab } from "./color";

export const SCORING = {
  wEmb: 0.6,
  wColor: 0.25,
  wCat: 0.15,
  /** verdict thresholds */
  strong: 85,
  soft: 70,
  /** ΔE00 at which color similarity reaches 0 */
  maxColorDe: 40,
} as const;

export type DuplicateVerdict = "strong" | "soft" | "none";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Cosine similarity of two equal-length vectors (-1..1). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface DuplicateInput {
  /** Cosine similarity of the two fashion embeddings (e.g. from pgvector). */
  embeddingCosine: number;
  /** Dominant colors of each garment in CIE Lab. */
  labA: Lab;
  labB: Lab;
  sameSubcategory: boolean;
  sameCategory: boolean;
}

export interface DuplicateResult {
  /** 0..100 "이미 비슷한 옷 있음" likelihood. */
  score: number;
  verdict: DuplicateVerdict;
  parts: { simEmb: number; simColor: number; simCat: number };
}

export function duplicateScore(input: DuplicateInput): DuplicateResult {
  const simEmb = clamp01((input.embeddingCosine + 1) / 2);
  const simColor = colorSimilarity(input.labA, input.labB, SCORING.maxColorDe);
  const simCat = input.sameSubcategory ? 1 : input.sameCategory ? 0.6 : 0;

  const raw =
    100 *
    (SCORING.wEmb * simEmb + SCORING.wColor * simColor + SCORING.wCat * simCat);
  const score = Math.round(raw * 10) / 10;
  const verdict: DuplicateVerdict =
    score >= SCORING.strong ? "strong" : score >= SCORING.soft ? "soft" : "none";

  return { score, verdict, parts: { simEmb, simColor, simCat } };
}

/**
 * Score when dominant colors aren't available yet (color extraction not wired).
 * Color weight is redistributed across embedding + category.
 */
export function duplicateScoreNoColor(input: {
  embeddingCosine: number;
  sameSubcategory: boolean;
  sameCategory: boolean;
}): DuplicateResult {
  const simEmb = clamp01((input.embeddingCosine + 1) / 2);
  const simCat = input.sameSubcategory ? 1 : input.sameCategory ? 0.6 : 0;
  const w = SCORING.wEmb + SCORING.wCat;
  const raw = (100 * (SCORING.wEmb * simEmb + SCORING.wCat * simCat)) / w;
  const score = Math.round(raw * 10) / 10;
  const verdict: DuplicateVerdict =
    score >= SCORING.strong ? "strong" : score >= SCORING.soft ? "soft" : "none";
  return { score, verdict, parts: { simEmb, simColor: 0, simCat } };
}

/** Convenience: compute the embedding cosine from raw vectors, then score. */
export function duplicateScoreFromVectors(
  embA: number[],
  embB: number[],
  rest: Omit<DuplicateInput, "embeddingCosine">,
): DuplicateResult {
  return duplicateScore({
    ...rest,
    embeddingCosine: cosineSimilarity(embA, embB),
  });
}
