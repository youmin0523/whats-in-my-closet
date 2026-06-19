"use client";

import { useActionState } from "react";
import { askStylistAction, type StylistState } from "@/server/actions/stylist";
import { Button } from "@/components/ui/button";

const initial: StylistState = { status: "idle" };

export function StylistChat() {
  const [state, action, pending] = useActionState(askStylistAction, initial);

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">AI 스타일리스트</p>
      <form action={action} className="mt-3 flex gap-2">
        <input
          name="question"
          placeholder="오늘 뭐 입지? 이 니트에 뭐가 어울려?"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "물어보기"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="mt-2 text-sm text-destructive">{state.message}</p>
      )}

      {state.status === "ok" && state.answer && (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm">{state.answer}</p>
          {state.items && state.items.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {state.items.map((it) =>
                it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={it.id}
                    src={it.thumbnailUrl}
                    alt={it.name ?? "옷"}
                    className="aspect-square rounded border bg-background object-contain p-1"
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
