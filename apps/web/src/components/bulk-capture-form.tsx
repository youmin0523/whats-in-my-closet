"use client";

import { useActionState } from "react";
import { bulkAddAction, type BulkState } from "@/server/actions/bulk";
import { Button } from "@/components/ui/button";

const initial: BulkState = {
  status: "idle",
  message: "",
  previews: [],
  persisted: 0,
};

export function BulkCaptureForm() {
  const [state, action, pending] = useActionState(bulkAddAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3">
        <input
          type="file"
          name="images"
          accept="image/*"
          multiple
          required
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "올리는 중…" : "여러 벌 한번에 올리기"}
        </Button>
      </form>

      {state.status !== "idle" && (
        <div
          className={
            state.status === "error"
              ? "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              : "rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground"
          }
        >
          <p>{state.message}</p>
          {state.previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {state.previews.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${u}-${i}`}
                  src={u}
                  alt="업로드한 옷"
                  className="aspect-square w-full rounded-md border bg-background object-contain p-1"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
