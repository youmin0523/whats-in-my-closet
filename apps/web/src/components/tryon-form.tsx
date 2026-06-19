"use client";

import { useActionState } from "react";
import { tryOnAction, type TryOnState } from "@/server/actions/tryon";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera-capture";

const initial: TryOnState = { status: "idle", message: "" };

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="file"
        name={name}
        accept="image/*"
        required
        className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
      />
    </label>
  );
}

export function TryOnForm() {
  const [state, action, pending] = useActionState(tryOnAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4">
        <FileField label="내 사진 (전신·상반신)" name="base" />
        <CameraCapture targetInputName="base" label="내 모습 촬영" />
        <FileField label="입혀볼 옷 사진" name="garment" />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "입혀보는 중…" : "입혀보기"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "ok" && state.resultUrl && (
        <div className="rounded-lg border bg-secondary/30 p-4">
          <p className="text-sm text-muted-foreground">{state.message}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.resultUrl}
            alt="가상 피팅 결과"
            className="mt-3 w-full rounded-md border bg-background object-contain"
          />
        </div>
      )}
    </div>
  );
}
