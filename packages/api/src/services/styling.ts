import { z } from "zod";
import type { OutfitConstraints } from "../lib/recommend";

export interface StylingCandidate {
  id: number;
  name: string | null;
  category: string | null;
}
export interface StylingResult {
  garmentIds: number[];
  rationale: string;
  model: string | null;
}

const StylingSchema = z.object({
  garmentIds: z.array(z.number()),
  rationale: z.string(),
});

export interface StylingService {
  isReal: boolean;
  suggest(input: {
    constraints: OutfitConstraints;
    candidates: StylingCandidate[];
    palette: string[];
  }): Promise<StylingResult>;
}

function heuristic(
  candidates: StylingCandidate[],
  constraints: OutfitConstraints,
): StylingResult {
  const pick = (c: string) => candidates.find((g) => g.category === c)?.id;
  const ids = [
    pick("tops"),
    pick("bottoms"),
    constraints.outerWeight !== "none" ? pick("outerwear") : undefined,
    pick("shoes"),
  ].filter((x): x is number => typeof x === "number");
  return {
    garmentIds: ids,
    rationale: "오늘 날씨에 맞춰 기본 코디를 골랐어요.",
    model: null,
  };
}

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

/** LLM styling layer — Claude picks an outfit from owned candidates within the
 *  hard constraints + personal palette; heuristic fallback without a key. */
export function getStylingService(): StylingService {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  if (!key) {
    return {
      isReal: false,
      suggest: async ({ candidates, constraints }) =>
        heuristic(candidates, constraints),
    };
  }

  return {
    isReal: true,
    async suggest({ constraints, candidates, palette }) {
      const prompt = `오늘 코디를 아래 JSON만 출력해 골라줘(설명/마크다운 금지).
{"garmentIds":[보유 후보 id만], "rationale":"한국어 1~2문장"}
제약: ${JSON.stringify(constraints)}
퍼스널 팔레트(hex): ${palette.join(", ") || "없음"}
보유 후보: ${JSON.stringify(candidates)}`;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) return heuristic(candidates, constraints);
        const json = (await res.json()) as { content: Array<{ text?: string }> };
        const parsed = StylingSchema.safeParse(
          JSON.parse(stripFences(json.content?.[0]?.text ?? "{}")),
        );
        if (!parsed.success) return heuristic(candidates, constraints);
        // keep only ids that are actually owned candidates (no hallucinations)
        const valid = parsed.data.garmentIds.filter((id) =>
          candidates.some((c) => c.id === id),
        );
        return {
          garmentIds: valid.length
            ? valid
            : heuristic(candidates, constraints).garmentIds,
          rationale: parsed.data.rationale,
          model,
        };
      } catch {
        return heuristic(candidates, constraints);
      }
    },
  };
}

/** Free-form AI stylist Q&A grounded to the user's owned items. */
export async function stylistAnswer(
  question: string,
  candidates: StylingCandidate[],
): Promise<{ answer: string; garmentIds: number[] }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      answer:
        "AI 스타일리스트는 ANTHROPIC_API_KEY 설정 후 답변해드려요. 지금은 ‘오늘 추천’을 사용해보세요.",
      garmentIds: [],
    };
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const prompt = `당신은 친근한 패션 스타일리스트입니다. 사용자의 보유 옷만 활용해 한국어로 답하고, 추천한 보유 옷 id를 함께 주세요.
질문: ${question}
보유 옷: ${JSON.stringify(candidates)}
JSON만 출력: {"answer": "한국어 답변", "garmentIds": [추천한 보유 옷 id...]}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { answer: "지금은 답변을 가져오지 못했어요.", garmentIds: [] };
    const json = (await res.json()) as { content: Array<{ text?: string }> };
    const text = stripFences(json.content?.[0]?.text ?? "{}");
    const parsed = z
      .object({ answer: z.string(), garmentIds: z.array(z.number()).default([]) })
      .safeParse(JSON.parse(text));
    if (!parsed.success)
      return { answer: json.content?.[0]?.text ?? "…", garmentIds: [] };
    const ids = parsed.data.garmentIds.filter((id) =>
      candidates.some((c) => c.id === id),
    );
    return { answer: parsed.data.answer, garmentIds: ids };
  } catch {
    return { answer: "지금은 답변을 가져오지 못했어요.", garmentIds: [] };
  }
}
