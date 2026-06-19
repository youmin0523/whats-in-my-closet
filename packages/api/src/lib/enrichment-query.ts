/**
 * Build a shopping-search query from tag-reader fields, and clean provider titles.
 * Pure + golden-tested. Used by the catalog-enrichment service (scan-tag → 제품 매칭).
 */
export function buildProductQuery(fields: {
  brand?: string | null;
  productName?: string | null;
}): string {
  return [fields.brand, fields.productName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip Naver's <b> highlight tags + HTML entities from a product title. */
export function cleanProductTitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
