/**
 * Resolve free-text AI tags (category / subcategory names) to taxonomy IDs.
 *
 * The tagging model returns names as strings ("tops", "셔츠", "long-sleeve tee");
 * this maps them onto the seeded categories/subcategories so auto-tagged garments
 * land in the right bucket — inventory by-subcategory, closet filters, and the
 * duplicate score's same-subcategory term all key off these IDs.
 *
 * Pure + deterministic → golden-tested. Matching is loose (slug / Korean / English,
 * case- and separator-insensitive) because the model's wording is not constrained
 * for subcategory. A matched subcategory pins its own category, so a stray category
 * string can't override a confident subcategory.
 */
export type TaxCat = {
  id: number;
  slug: string;
  nameKo: string;
  nameEn?: string | null;
};
export type TaxSub = {
  id: number;
  categoryId: number;
  slug: string;
  nameKo: string;
  nameEn?: string | null;
};

/** Lowercase and drop spaces / underscores / slashes / hyphens for loose matching. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_/-]+/g, "");
}

export function resolveTaxonomy(
  cats: TaxCat[],
  subs: TaxSub[],
  category?: string | null,
  subcategory?: string | null,
): { categoryId?: number; subcategoryId?: number } {
  const c = category ? norm(category) : "";
  let cat: TaxCat | undefined = c
    ? (cats.find((x) => norm(x.slug) === c) ??
      cats.find((x) => norm(x.nameKo) === c) ??
      cats.find((x) => (x.nameEn ? norm(x.nameEn) === c : false)))
    : undefined;

  const s = subcategory ? norm(subcategory) : "";
  let sub: TaxSub | undefined;
  if (s) {
    // Prefer subcategories inside the resolved category; otherwise search all.
    const pool = cat ? subs.filter((x) => x.categoryId === cat!.id) : subs;
    sub =
      pool.find((x) => norm(x.slug) === s) ??
      pool.find((x) => norm(x.nameKo) === s) ??
      pool.find((x) => (x.nameEn ? norm(x.nameEn) === s : false)) ??
      pool.find((x) => {
        const k = norm(x.nameKo);
        return k.length >= 2 && (k.includes(s) || s.includes(k));
      });
    // If the category string was missing/unrecognized, adopt the sub's category.
    if (sub && !cat) cat = cats.find((x) => x.id === sub!.categoryId);
  }

  return { categoryId: cat?.id, subcategoryId: sub?.id };
}

/**
 * Render the taxonomy as a compact hint for the tagging prompt, so the model
 * returns a real subcategory slug instead of free wording. One line per category:
 *   tops(상의): short_tee=반팔 티셔츠, long_tee=긴팔 티셔츠, …
 */
export function buildTaxonomyHint(cats: TaxCat[], subs: TaxSub[]): string {
  return cats
    .map((c) => {
      const list = subs
        .filter((s) => s.categoryId === c.id)
        .map((s) => `${s.slug}=${s.nameKo}`)
        .join(", ");
      return list
        ? `${c.slug}(${c.nameKo}): ${list}`
        : `${c.slug}(${c.nameKo})`;
    })
    .join("\n");
}
