/**
 * Product catalog enrichment — turn a read clothing tag (brand + name) into real
 * catalog matches (official title, price, image, link). Env-gated like every
 * service: with Naver Search keys it queries 쇼핑검색; without, it returns [] so
 * the scan-tag flow still works (manual entry). Retried + cached.
 */
import { cleanProductTitle } from "../lib/enrichment-query";
import { createTtlCache, HttpError, withRetry } from "../lib/resilience";

export interface ProductMatch {
  title: string;
  brand: string | null;
  priceKrw: number | null;
  imageUrl: string | null;
  productUrl: string | null;
  mallName: string | null;
  source: string;
}

export interface EnrichmentService {
  isReal: boolean;
  search(query: string, limit?: number): Promise<ProductMatch[]>;
}

const cache = createTtlCache<ProductMatch[]>({
  ttlMs: 6 * 60 * 60 * 1000,
  max: 500,
});

interface NaverShopItem {
  title?: string;
  link?: string;
  image?: string;
  lprice?: string;
  mallName?: string;
  brand?: string;
  maker?: string;
}

export function getEnrichmentService(): EnrichmentService {
  const id = process.env.NAVER_SEARCH_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!id || !secret) {
    return { isReal: false, search: async () => [] };
  }

  return {
    isReal: true,
    async search(query, limit = 5) {
      const q = query.trim();
      if (!q) return [];
      const cacheKey = `${q}::${limit}`;
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      try {
        const matches = await withRetry(async () => {
          const url =
            `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}` +
            `&display=${limit}&sort=sim`;
          const res = await fetch(url, {
            headers: {
              "X-Naver-Client-Id": id,
              "X-Naver-Client-Secret": secret,
            },
          });
          if (!res.ok) throw new HttpError("Naver shop search failed", res.status);
          const json = (await res.json()) as { items?: NaverShopItem[] };
          return (json.items ?? []).map(
            (it): ProductMatch => ({
              title: cleanProductTitle(it.title ?? ""),
              brand: it.brand || it.maker || null,
              priceKrw: it.lprice ? Number(it.lprice) || null : null,
              imageUrl: it.image || null,
              productUrl: it.link || null,
              mallName: it.mallName || null,
              source: "naver",
            }),
          );
        });
        cache.set(cacheKey, matches);
        return matches;
      } catch {
        return [];
      }
    },
  };
}
