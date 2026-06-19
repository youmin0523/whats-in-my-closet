import { z } from "zod";
import { createTtlCache, withRetry } from "../lib/resilience";
import { hasLlm, llmText } from "./llm";

/** Structured attributes auto-extracted from a garment image. */
export const GarmentTagsSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullish(),
  colors: z.array(z.string()).default([]),
  pattern: z.string().nullish(),
  material: z.string().nullish(),
  season: z.array(z.string()).default([]),
  style: z.array(z.string()).default([]),
  fit: z.string().nullish(),
  name: z.string().nullish(),
});
export type GarmentTags = z.infer<typeof GarmentTagsSchema>;

const FALLBACK: GarmentTags = {
  category: "tops",
  subcategory: null,
  colors: [],
  pattern: null,
  material: null,
  season: [],
  style: [],
  fit: null,
  name: null,
};

const BASE_PROMPT = `이 의류 사진을 분석해 아래 JSON만 출력하세요(설명/마크다운 금지).
{"category": "tops|bottoms|outerwear|dresses|shoes|socks|bags|accessories|headwear|underwear",
"subcategory": string|null, "colors": ["#hex", ...], "pattern": string|null,
"material": string|null, "season": ["spring"|"summer"|"fall"|"winter"...], "style": [string...],
"fit": string|null, "name": "짧은 한국어 이름"}`;

/** Append the taxonomy so the model returns a real subcategory slug, not free text. */
function buildPrompt(taxonomyHint?: string): string {
  if (!taxonomyHint) return BASE_PROMPT;
  return `${BASE_PROMPT}

category와 subcategory는 아래 목록에서 고르세요. subcategory는 반드시 해당 category에 속한 slug(영문)로만 답하고, 적절한 항목이 없으면 null로 두세요.
${taxonomyHint}`;
}

export interface TaggingService {
  isReal: boolean;
  tag(imageUrl: string, taxonomyHint?: string): Promise<GarmentTags>;
}

// Cache successful tags per image (re-tagging the same upload is wasteful).
const tagCache = createTtlCache<GarmentTags>({
  ttlMs: 6 * 60 * 60 * 1000,
  max: 2000,
});

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export function getTaggingService(): TaggingService {
  if (!hasLlm()) {
    return { isReal: false, tag: async () => ({ ...FALLBACK }) };
  }

  return {
    isReal: true,
    async tag(imageUrl, taxonomyHint) {
      const cached = tagCache.get(imageUrl);
      if (cached) return cached;
      try {
        const tags = await withRetry(async () => {
          const text = await llmText({
            prompt: buildPrompt(taxonomyHint),
            imageUrl,
            maxTokens: 512,
          });
          const parsed = GarmentTagsSchema.safeParse(
            JSON.parse(stripFences(text) || "{}"),
          );
          if (!parsed.success) throw new Error("tag parse failed");
          return parsed.data;
        });
        tagCache.set(imageUrl, tags);
        return tags;
      } catch {
        // exhausted retries / malformed → graceful fallback (not cached)
        return { ...FALLBACK };
      }
    },
  };
}
