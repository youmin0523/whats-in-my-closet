/**
 * Provider-flexible LLM layer. The AI services (tagging, detection, tag-reader,
 * styling) call `llmText()` instead of a hardcoded vendor, so the app works with
 * **OpenAI or Anthropic** by env — no code change to switch:
 *   OPENAI_API_KEY     → OpenAI (gpt-4o-mini by default, cheap + vision)
 *   ANTHROPIC_API_KEY  → Claude (claude-sonnet-4-6 / set ANTHROPIC_MODEL)
 *   neither            → callers use their deterministic fallback
 * OpenAI is preferred when both are set.
 */
import { HttpError } from "../lib/resilience";

export type LlmProvider = "openai" | "anthropic";

/** Configured provider (OpenAI preferred), or null → fallback. */
export function llmProvider(): LlmProvider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function hasLlm(): boolean {
  return llmProvider() !== null;
}

/** The model name in use (stored on records / logging). */
export function llmModel(): string | null {
  const p = llmProvider();
  if (p === "openai") return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (p === "anthropic")
    return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  return null;
}

export interface LlmRequest {
  prompt: string;
  /** Optional image URL for vision tasks (must be publicly fetchable). */
  imageUrl?: string;
  maxTokens?: number;
}

/**
 * One-shot completion → the model's text output. Routes to the configured
 * provider. Throws HttpError on a non-2xx response (so callers can retry);
 * throws a plain Error if no provider is configured.
 */
export async function llmText(req: LlmRequest): Promise<string> {
  const p = llmProvider();
  if (p === "openai") return callOpenAI(req);
  if (p === "anthropic") return callAnthropic(req);
  throw new Error("No LLM provider (set OPENAI_API_KEY or ANTHROPIC_API_KEY)");
}

async function callOpenAI({
  prompt,
  imageUrl,
  maxTokens,
}: LlmRequest): Promise<string> {
  const key = process.env.OPENAI_API_KEY as string;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: prompt },
  ];
  if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 1024,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new HttpError("OpenAI request failed", res.status);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic({
  prompt,
  imageUrl,
  maxTokens,
}: LlmRequest): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY as string;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const content: Array<Record<string, unknown>> = [];
  if (imageUrl)
    content.push({ type: "image", source: { type: "url", url: imageUrl } });
  content.push({ type: "text", text: prompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 1024,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new HttpError("Anthropic request failed", res.status);
  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  return json.content?.[0]?.text ?? "";
}
