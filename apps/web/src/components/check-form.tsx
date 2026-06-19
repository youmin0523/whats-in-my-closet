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
          {(() => {
            // Show *which* owned clothes are similar — image + name + score,
            // each linking to its detail page so the user can recognize it.
            const similar = (state.matches ?? []).filter(
              (m) => m.verdict !== "none",
            );
            if (similar.length === 0) return null;
            return (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">
                  내 옷장에 있는 비슷한 옷
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {similar.map((m) => (
                    <a
                      key={m.garmentId}
                      href={`/closet/${m.garmentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-lg border bg-background/70 p-2 transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-background">
                        {m.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.thumbnailUrl}
                            alt={m.name ?? "옷"}
                            className="size-full object-contain p-1"
                          />
                        ) : (
                          <div className="size-full bg-muted" />
                        )}
                        <span className="absolute right-1 top-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-background">
                          {m.score}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-xs font-medium text-foreground">
                        {m.name ?? "이름 없음"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.verdict === "strong" ? "거의 같아요" : "비슷해요"}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* The choice to add is always the user's — basics/같은 디자인 다벌도 OK. */}
          {state.verdict && state.verdict !== "none" && (
            <div className="mt-4 flex flex-col gap-2 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm opacity-80">
                기본템이거나 마음에 들면 여러 벌도 괜찮아요.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href="/closet/add">그래도 추가하기</a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
