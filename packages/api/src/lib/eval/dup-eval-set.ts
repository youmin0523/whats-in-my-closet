/**
 * Labeled evaluation set for the duplicate/similarity engine (플랜 Phase 2 검증).
 *
 * Each row is a (candidate vs existing) pair with a human ground-truth band:
 *   dup     — the same physical garment (different photo/angle/light) → should hard-warn
 *   similar — a different but close item (same family/color)          → should soft-warn
 *   diff    — unrelated                                               → should not warn
 *
 * The pairs are expressed as inputs to the PURE scoring layer (embedding cosine +
 * two dominant-color hexes + category match), so the whole harness runs with **no
 * keys / no model** — it calibrates the blend weights & thresholds in `scoring.ts`.
 * When real embeddings arrive, swap these synthetic-but-representative rows for
 * measured ones and re-run the same metrics. A few intentionally HARD rows keep
 * the engine honest (a color-identical near-twin; a true dup whose embedding drifted).
 */
export type EvalLabel = "dup" | "similar" | "diff";

export interface EvalPair {
  id: string;
  note: string;
  embeddingCosine: number;
  hexA: string;
  hexB: string;
  sameSubcategory: boolean;
  sameCategory: boolean;
  label: EvalLabel;
}

export const DUP_EVAL_SET: EvalPair[] = [
  // ── duplicates (same item) → expect strong ─────────────────────────────
  { id: "d01", note: "네이비 니트 정/측면", embeddingCosine: 0.97, hexA: "#1f2a44", hexB: "#1f2a44", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d02", note: "블랙 후드 두 컷", embeddingCosine: 0.95, hexA: "#181818", hexB: "#1c1c1c", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d03", note: "화이트 티 앞/뒤", embeddingCosine: 0.93, hexA: "#f2f2f0", hexB: "#eef0ee", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d04", note: "청바지 두 컷", embeddingCosine: 0.9, hexA: "#2b3a5a", hexB: "#2f3e5e", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d05", note: "베이지 코트", embeddingCosine: 0.92, hexA: "#d8c9a8", hexB: "#d3c4a3", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d06", note: "레드 원피스", embeddingCosine: 0.94, hexA: "#b3261e", hexB: "#b82a22", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d07", note: "그레이 맨투맨", embeddingCosine: 0.96, hexA: "#9a9a9a", hexB: "#979797", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d08", note: "올리브 카고", embeddingCosine: 0.89, hexA: "#3a5a3a", hexB: "#365636", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d09", note: "브라운 가디건", embeddingCosine: 0.91, hexA: "#5a3a2a", hexB: "#563827", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d10", note: "머스타드 니트", embeddingCosine: 0.9, hexA: "#c0a030", hexB: "#bba02e", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d11", note: "오프화이트 셔츠", embeddingCosine: 0.98, hexA: "#fafaf8", hexB: "#f6f6f4", sameSubcategory: true, sameCategory: true, label: "dup" },
  { id: "d12", note: "카키 야상", embeddingCosine: 0.88, hexA: "#4b5320", hexB: "#474f1e", sameSubcategory: true, sameCategory: true, label: "dup" },
  // HARD: real dup but the embedding drifted (steep angle / lighting)
  { id: "d13", note: "[hard] 같은 옷, 임베딩 약함", embeddingCosine: 0.45, hexA: "#aa3322", hexB: "#ab3423", sameSubcategory: true, sameCategory: true, label: "dup" },

  // ── similar (different item, close) → expect soft ──────────────────────
  { id: "s01", note: "네이비 니트 두 디자인", embeddingCosine: 0.68, hexA: "#1f2a44", hexB: "#243150", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s02", note: "화이트 셔츠 두 종", embeddingCosine: 0.62, hexA: "#f0f0ee", hexB: "#e6e6e4", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s03", note: "청바지 워싱 차이", embeddingCosine: 0.6, hexA: "#2b3a5a", hexB: "#3a4a6a", sameSubcategory: true, sameCategory: true, label: "similar" },
  { id: "s04", note: "레드 계열 두 벌", embeddingCosine: 0.55, hexA: "#b3261e", hexB: "#c44b3a", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s05", note: "올리브 두 벌", embeddingCosine: 0.58, hexA: "#5a5a3a", hexB: "#6a6a4a", sameSubcategory: true, sameCategory: true, label: "similar" },
  { id: "s06", note: "블랙 슬랙스 유사", embeddingCosine: 0.5, hexA: "#181818", hexB: "#202020", sameSubcategory: true, sameCategory: true, label: "similar" },
  { id: "s07", note: "베이지 톤 유사", embeddingCosine: 0.45, hexA: "#d8c9a8", hexB: "#cabb9a", sameSubcategory: true, sameCategory: true, label: "similar" },
  { id: "s08", note: "그레이 두 벌", embeddingCosine: 0.65, hexA: "#9a9a9a", hexB: "#8a8a8a", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s09", note: "같은 네이비 다른 옷", embeddingCosine: 0.5, hexA: "#2b3a5a", hexB: "#2b3a5a", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s10", note: "같은 네이비, 임베딩 약함", embeddingCosine: 0.4, hexA: "#1f2a44", hexB: "#1f2a44", sameSubcategory: true, sameCategory: true, label: "similar" },
  { id: "s11", note: "레드 두 벌", embeddingCosine: 0.6, hexA: "#b3261e", hexB: "#b3261e", sameSubcategory: false, sameCategory: true, label: "similar" },
  { id: "s12", note: "머스타드 유사", embeddingCosine: 0.55, hexA: "#c0a030", hexB: "#b09028", sameSubcategory: true, sameCategory: true, label: "similar" },
  // HARD: color- & category-identical near-twin, but a different garment
  { id: "s13", note: "[hard] 색·종류 같은 다른 옷", embeddingCosine: 0.7, hexA: "#1f2a44", hexB: "#1f2a44", sameSubcategory: true, sameCategory: true, label: "similar" },

  // ── different (unrelated) → expect none ────────────────────────────────
  { id: "x01", note: "레드 vs 화이트, 다른 종류", embeddingCosine: 0.15, hexA: "#b3261e", hexB: "#ecf0f1", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x02", note: "네이비 vs 화이트, 다른 종류", embeddingCosine: 0.2, hexA: "#1f2a44", hexB: "#f2f2f0", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x03", note: "블랙 vs 베이지, 다른 종류", embeddingCosine: 0.3, hexA: "#181818", hexB: "#d8c9a8", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x04", note: "네이비 vs 레드, 다른 종류", embeddingCosine: 0.1, hexA: "#2b3a5a", hexB: "#c0392b", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x05", note: "올리브 vs 그레이, 같은 종류", embeddingCosine: 0.4, hexA: "#5a5a3a", hexB: "#9a9a9a", sameSubcategory: false, sameCategory: true, label: "diff" },
  { id: "x06", note: "레드 vs 네이비, 다른 종류", embeddingCosine: 0.35, hexA: "#b3261e", hexB: "#2b3a5a", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x07", note: "화이트 vs 네이비, 다른 종류", embeddingCosine: 0.45, hexA: "#f0f0ee", hexB: "#1f2a44", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x08", note: "베이지 vs 블랙, 다른 종류", embeddingCosine: 0.25, hexA: "#d8c9a8", hexB: "#181818", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x09", note: "그레이 vs 브라운, 같은 종류", embeddingCosine: 0.42, hexA: "#9a9a9a", hexB: "#5a3a2a", sameSubcategory: false, sameCategory: true, label: "diff" },
  { id: "x10", note: "[hard] 같은 네이비, 다른 카테고리", embeddingCosine: 0.45, hexA: "#2b3a5a", hexB: "#2b3a5a", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x11", note: "머스타드 vs 블루, 다른 종류", embeddingCosine: 0.3, hexA: "#c0a030", hexB: "#3a4a6a", sameSubcategory: false, sameCategory: false, label: "diff" },
  { id: "x12", note: "레드 vs 블랙, 같은 종류", embeddingCosine: 0.38, hexA: "#b82a22", hexB: "#1c1c1c", sameSubcategory: false, sameCategory: true, label: "diff" },
];
