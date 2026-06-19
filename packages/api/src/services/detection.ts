import { z } from "zod";
import { HttpError, withRetry } from "../lib/resilience";

/** A detected garment region (normalized 0..1 bbox) within a bulk-capture photo. */
export const DetectedItemSchema = z.object({
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  category: z.string().nullish(),
  label: z.string().nullish(),
});
export type DetectedItem = z.infer<typeof DetectedItemSchema>;

/** Whole image = one garment (used by single capture, and the dev fallback). */
const WHOLE: DetectedItem = { bbox: { x: 0, y: 0, w: 1, h: 1 } };

const PROMPT = `사진 속 각 의류 아이템의 위치를 정규화 좌표(0~1)로 찾아 JSON 배열만 출력하세요(설명 금지).
[{"bbox": {"x": number, "y": number, "w": number, "h": number}, "category": string, "label": "짧은 한국어"}]`;

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export interface DetectionService {
  isReal: boolean;
  detect(imageUrl: string): Promise<DetectedItem[]>;
}

export function getDetectionService(): DetectionService {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  if (!key) {
    return { isReal: false, detect: async () => [{ ...WHOLE }] };
  }

  return {
    isReal: true,
    async detect(imageUrl) {
      return withRetry(async () => {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: [
                  { type: "image", source: { type: "url", url: imageUrl } },
                  { type: "text", text: PROMPT },
                ],
              },
            ],
          }),
        });
        if (!res.ok) throw new HttpError("Anthropic detect failed", res.status);
        const json = (await res.json()) as {
          content: Array<{ text?: string }>;
        };
        const text = json.content?.[0]?.text ?? "[]";
        // Malformed JSON → whole-image fallback (don't retry a parse error).
        let items: DetectedItem[] | null = null;
        try {
          const parsed = z
            .array(DetectedItemSchema)
            .safeParse(JSON.parse(stripFences(text)));
          if (parsed.success && parsed.data.length > 0) items = parsed.data;
        } catch {
          items = null;
        }
        return items ?? [{ ...WHOLE }];
      });
    },
  };
}
