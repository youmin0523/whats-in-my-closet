"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addGarmentAction,
  type AddGarmentState,
} from "@/server/actions/garments";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera-capture";
import { PhotoInput } from "@/components/photo-input";

// While the (multi-second AI) save runs, show what's happening so the wait
// reads as progress, not a freeze — same time, feels faster.
const STAGES = ["사진 올리는 중…", "AI가 분류하는 중…", "비슷한 옷 찾는 중…"];

type Cat = {
  id: number;
  slug: string;
  nameKo: string;
  subs: { id: number; slug: string; nameKo: string }[];
};

const initial: AddGarmentState = { status: "idle", message: "" };

const inputClass =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SEASONS = [
  ["spring", "봄"],
  ["summer", "여름"],
  ["fall", "가을"],
  ["winter", "겨울"],
] as const;

export function AddGarmentForm({ taxonomy = [] }: { taxonomy?: Cat[] }) {
  const [state, action, pending] = useActionState(addGarmentAction, initial);
  const [catId, setCatId] = useState("");
  const subs = taxonomy.find((c) => String(c.id) === catId)?.subs ?? [];

  // advance the progress label every ~1.3s while saving
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!pending) {
      setStage(0);
      return;
    }
    const id = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      1300,
    );
    return () => clearInterval(id);
  }, [pending]);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <PhotoInput name="image" required />
        <CameraCapture targetInputName="image" />
        <input name="name" placeholder="이름 (선택)" className={inputClass} />

        {taxonomy.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <select
              name="categoryId"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className={inputClass}
            >
              <option value="">카테고리</option>
              {taxonomy.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameKo}
                </option>
              ))}
            </select>
            <select
              key={catId}
              name="subcategoryId"
              className={inputClass}
              disabled={subs.length === 0}
            >
              <option value="">세부 분류</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameKo}
                </option>
              ))}
            </select>
          </div>
        )}

        {taxonomy.length > 0 && (
          <p className="-mt-1 text-xs text-muted-foreground">
            비워두면 사진을 보고 AI가 분류해줘요. 나중에 언제든 고칠 수 있어요.
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {SEASONS.map(([val, label]) => (
            <label key={val} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="season"
                value={val}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="wishlist" className="size-4" />
          위시리스트 (살까 말까 고민중)
        </label>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? STAGES[stage] : "추가"}
        </Button>
      </form>

      {state.status !== "idle" && (
        <div
          className={
            state.status === "error"
              ? "mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              : "mt-4 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground"
          }
        >
          <p>{state.message}</p>
          {state.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.imageUrl}
              alt="방금 올린 옷"
              className="mt-3 aspect-square w-full rounded-md border bg-background object-contain p-2"
            />
          )}

          {/* informational — you decide whether the new piece earns its place */}
          {state.similar && state.similar.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">
                옷장에 있는 비슷한 옷
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {state.similar.map((m) => (
                  <a
                    key={m.garmentId}
                    href={`/closet/${m.garmentId}`}
                    className="group block rounded-md border bg-background/70 p-1.5 transition-colors hover:border-foreground/30"
                  >
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnailUrl}
                        alt={m.name ?? "비슷한 옷"}
                        className="aspect-square w-full rounded bg-background object-contain"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded bg-muted" />
                    )}
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {m.name ?? "이름 없음"}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
