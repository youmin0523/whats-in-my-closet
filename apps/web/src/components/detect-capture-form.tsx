"use client";

import { useActionState } from "react";
import {
  commitDetectedAction,
  detectCaptureAction,
  type DetectState,
} from "@/server/actions/detect-capture";
import { Button } from "@/components/ui/button";
import { PhotoInput } from "@/components/photo-input";

const initial: DetectState = { status: "idle" };

export function DetectCaptureForm() {
  const [state, action, pending] = useActionState(detectCaptureAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3">
        <PhotoInput name="image" required />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "옷 찾는 중…" : "옷 찾기"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "ok" && state.drafts && (
        <form action={commitDetectedAction} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {state.drafts.length}벌을 찾았어요. 이름을 확인하고 등록하세요.
          </p>
          <input
            type="hidden"
            name="drafts"
            value={JSON.stringify(state.drafts)}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {state.drafts.map((d, i) => (
              <div key={i} className="rounded-lg border bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.imageUrl}
                  alt={`옷 ${i + 1}`}
                  className="aspect-square w-full rounded bg-background object-contain"
                />
                <input
                  name={`name-${i}`}
                  placeholder="이름 (선택)"
                  className="mt-2 h-8 w-full rounded border bg-background px-2 text-xs"
                />
              </div>
            ))}
          </div>
          <Button type="submit" size="lg">
            전부 옷장에 등록
          </Button>
        </form>
      )}
    </div>
  );
}
