import { z } from "zod";
import { hasLlm, llmText } from "./llm";

/** Structured info read from a clothing hangtag / care label. */
export const TagInfoSchema = z.object({
  brand: z.string().nullish(),
  productName: z.string().nullish(),
  size: z.string().nullish(),
  material: z.string().nullish(), // 혼용률 텍스트
  care: z.string().nullish(), // 세탁 정보
  colors: z.array(z.string()).default([]),
  category: z.string().nullish(),
});
export type TagInfo = z.infer<typeof TagInfoSchema>;

const EMPTY: TagInfo = {
  brand: null,
  productName: null,
  size: null,
  material: null,
  care: null,
  colors: [],
  category: null,
};

const PROMPT = `이 의류 택/라벨 사진의 텍스트를 읽어 제품 정보를 추출하고 JSON만 출력하세요(설명/마크다운 금지).
{"brand": string|null, "productName": string|null, "size": string|null,
"material": "혼용률 텍스트"|null, "care": "세탁 정보"|null, "colors": ["#hex"...],
"category": "tops|bottoms|outerwear|dresses|shoes|socks|bags|accessories|headwear|underwear"|null}`;

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export interface TagReaderService {
  isReal: boolean;
  read(imageUrl: string): Promise<TagInfo>;
}

/** Reads a clothing tag via Claude vision. Without a key, returns empty fields
 *  so the user can fill them in manually (the flow still works). */
export function getTagReaderService(): TagReaderService {
  if (!hasLlm()) {
    return { isReal: false, read: async () => ({ ...EMPTY }) };
  }

  return {
    isReal: true,
    async read(imageUrl) {
      try {
        const text = await llmText({ prompt: PROMPT, imageUrl, maxTokens: 512 });
        const parsed = TagInfoSchema.safeParse(
          JSON.parse(stripFences(text) || "{}"),
        );
        return parsed.success ? parsed.data : { ...EMPTY };
      } catch {
        return { ...EMPTY };
      }
    },
  };
}
