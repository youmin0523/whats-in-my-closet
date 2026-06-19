import { describe, expect, it } from "vitest";
import { hexToLab } from "./color";
import {
  cosineSimilarity,
  duplicateScore,
  duplicateScoreFromVectors,
  duplicateScoreNoColor,
} from "./scoring";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });
  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  it("returns 0 on length mismatch", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("duplicateScore", () => {
  const navy = hexToLab("#1f2a44");

  it("flags an (almost) identical item as 'strong'", () => {
    const r = duplicateScore({
      embeddingCosine: 0.97,
      labA: navy,
      labB: navy,
      sameSubcategory: true,
      sameCategory: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.verdict).toBe("strong");
  });

  it("returns 100 for a perfect match", () => {
    const r = duplicateScore({
      embeddingCosine: 1,
      labA: navy,
      labB: navy,
      sameSubcategory: true,
      sameCategory: true,
    });
    expect(r.score).toBeCloseTo(100, 1);
  });

  it("does not warn for an unrelated item", () => {
    const r = duplicateScore({
      embeddingCosine: 0.1,
      labA: hexToLab("#c0392b"), // red
      labB: hexToLab("#ecf0f1"), // off-white
      sameSubcategory: false,
      sameCategory: false,
    });
    expect(r.score).toBeLessThan(70);
    expect(r.verdict).toBe("none");
  });

  it("gives a soft warning for similar-but-not-same", () => {
    const r = duplicateScore({
      embeddingCosine: 0.6,
      labA: navy,
      labB: hexToLab("#26334f"), // close navy
      sameSubcategory: false,
      sameCategory: true,
    });
    expect(r.verdict === "soft" || r.verdict === "strong").toBe(true);
  });
});

describe("duplicateScoreNoColor", () => {
  it("flags identical embedding + same subcategory as strong", () => {
    const r = duplicateScoreNoColor({
      embeddingCosine: 1,
      sameSubcategory: true,
      sameCategory: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.verdict).toBe("strong");
  });
  it("does not warn for unrelated embedding + different category", () => {
    const r = duplicateScoreNoColor({
      embeddingCosine: 0,
      sameSubcategory: false,
      sameCategory: false,
    });
    expect(r.verdict).toBe("none");
  });
});

describe("duplicateScoreFromVectors", () => {
  it("matches duplicateScore with the computed cosine", () => {
    const navy = hexToLab("#1f2a44");
    const r = duplicateScoreFromVectors([1, 0, 0], [1, 0, 0], {
      labA: navy,
      labB: navy,
      sameSubcategory: true,
      sameCategory: true,
    });
    expect(r.score).toBeCloseTo(100, 1);
  });
});
