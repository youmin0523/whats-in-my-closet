import { describe, expect, it } from "vitest";
import {
  buildTaxonomyHint,
  resolveTaxonomy,
  type TaxCat,
  type TaxSub,
} from "./taxonomy";

const cats: TaxCat[] = [
  { id: 1, slug: "tops", nameKo: "상의", nameEn: "Tops" },
  { id: 2, slug: "bottoms", nameKo: "하의", nameEn: "Bottoms" },
  { id: 3, slug: "shoes", nameKo: "신발", nameEn: "Shoes" },
  { id: 4, slug: "outerwear", nameKo: "아우터", nameEn: "Outerwear" },
];
const subs: TaxSub[] = [
  { id: 11, categoryId: 1, slug: "shirt", nameKo: "셔츠", nameEn: "Shirt" },
  { id: 12, categoryId: 1, slug: "long_tee", nameKo: "긴팔 티셔츠", nameEn: "Long-sleeve T-shirt" },
  { id: 13, categoryId: 1, slug: "hoodie", nameKo: "후드티", nameEn: "Hoodie" },
  { id: 21, categoryId: 2, slug: "jeans", nameKo: "청바지", nameEn: "Jeans" },
  { id: 31, categoryId: 3, slug: "sneakers", nameKo: "스니커즈", nameEn: "Sneakers" },
];

describe("resolveTaxonomy", () => {
  it("matches category slug + Korean subcategory name", () => {
    expect(resolveTaxonomy(cats, subs, "tops", "셔츠")).toEqual({
      categoryId: 1,
      subcategoryId: 11,
    });
  });

  it("matches English subcategory name ignoring case/hyphens/spaces", () => {
    expect(resolveTaxonomy(cats, subs, "tops", "Long-sleeve T-shirt")).toEqual({
      categoryId: 1,
      subcategoryId: 12,
    });
  });

  it("matches by subcategory slug", () => {
    expect(resolveTaxonomy(cats, subs, "bottoms", "jeans")).toEqual({
      categoryId: 2,
      subcategoryId: 21,
    });
  });

  it("adopts the subcategory's category when category string is missing", () => {
    expect(resolveTaxonomy(cats, subs, null, "후드티")).toEqual({
      categoryId: 1,
      subcategoryId: 13,
    });
  });

  it("resolves category only when subcategory is absent", () => {
    expect(resolveTaxonomy(cats, subs, "shoes", null)).toEqual({
      categoryId: 3,
      subcategoryId: undefined,
    });
  });

  it("does not cross-assign a subcategory from another category", () => {
    // category says tops, but 청바지 lives under bottoms → keep tops, drop sub
    expect(resolveTaxonomy(cats, subs, "tops", "청바지")).toEqual({
      categoryId: 1,
      subcategoryId: undefined,
    });
  });

  it("returns empty for unrecognized input", () => {
    expect(resolveTaxonomy(cats, subs, "헬멧", "우주복")).toEqual({
      categoryId: undefined,
      subcategoryId: undefined,
    });
  });

  it("handles Korean category names too", () => {
    expect(resolveTaxonomy(cats, subs, "신발", "스니커즈")).toEqual({
      categoryId: 3,
      subcategoryId: 31,
    });
  });
});

describe("buildTaxonomyHint", () => {
  it("emits one line per category with slug=한글 subcategories", () => {
    const hint = buildTaxonomyHint(cats, subs);
    const lines = hint.split("\n");
    expect(lines).toHaveLength(cats.length);
    expect(lines[0]).toBe("tops(상의): shirt=셔츠, long_tee=긴팔 티셔츠, hoodie=후드티");
    expect(lines[2]).toBe("shoes(신발): sneakers=스니커즈");
  });

  it("round-trips: every emitted slug resolves back to its IDs", () => {
    // the model is told to answer with these slugs → resolveTaxonomy must accept them
    expect(resolveTaxonomy(cats, subs, "tops", "long_tee")).toEqual({
      categoryId: 1,
      subcategoryId: 12,
    });
  });
});
