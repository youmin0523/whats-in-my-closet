"use client";

import { useActionState } from "react";
import { checkDuplicateAction, type CheckState } from "@/server/actions/check";
import { Button } from "@/components/ui/button";

const initial: CheckState = { status: "idle", message: "" };

// Informational tones — not a stop sign. Even a near-duplicate isn't an error;
// owning multiples (기본템·같은 디자인 다벌) is a valid choice.
const verdictTone: Record<string, string> = {
  strong: "border-primary/50 bg-primary/10 text-foreground",
  soft: "border-primary/30 bg-primary/5 text-foreground",
  none: "border-border bg-secondary/40 text-muted-foreground",
};

export function CheckForm() {
  const [state, action, pending] = useActionState(checkDuplicateAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3">
        <input
          type="file"
          name="image"
          accept="image/*"
          required
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "확인 중…" : "내 옷장과 비교"}
        </Button>
      </form>

      {state.status !== "idle" && (
        <div
          className={`rounded-lg border p-4 ${
            state.status === "error"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : verdictTone[state.verdict ?? "none"]
          }`}
        >
          <p className="font-medium">{state.message}</p>
          {state.verdict && state.verdict !== "none" && (
            <p className="mt-1 text-sm tabular-nums opacity-80">
              유사도 {state.topScore}/100
            </p>
          )}
          {state.matches && state.matches.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {state.matches.map((m) => (
                <div key={m.garmentId} className="text-center">
                  {m.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumbnailUrl}
                      alt={m.name ?? "옷"}
                      className="aspect-square w-full rounded-md border bg-background object-contain p-1"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-md bg-muted" />
                  )}
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {m.score}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* The choice to add is always the user's — basics/같은 디자인 다벌도 OK. */}
          {state.verdict && state.verdict !== "none" && (
            <div className="mt-4 flex flex-col gap-2 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm opacity-80">
                기본템이거나 마음에 든다면 — 여러 벌도 괜찮아요. 결정은 당신
                몫이에요.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href="/closet/add">그래도 옷장에 추가</a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
