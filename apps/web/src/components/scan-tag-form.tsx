"use client";

import { useActionState, useRef } from "react";
import {
  createFromTagAction,
  readTagAction,
  type ProductMatch,
  type ScanTagState,
} from "@/server/actions/scan-tag";
import { Button } from "@/components/ui/button";
import { PhotoInput } from "@/components/photo-input";

const initial: ScanTagState = { status: "idle", message: "" };

const inputClass =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputClass} />
    </label>
  );
}

export function ScanTagForm() {
  const [state, action, pending] = useActionState(readTagAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  function applyMatch(m: ProductMatch) {
    const f = formRef.current;
    if (!f) return;
    const pn = f.elements.namedItem("productName") as HTMLInputElement | null;
    const br = f.elements.namedItem("brand") as HTMLInputElement | null;
    if (pn) pn.value = m.title;
    if (br && m.brand) br.value = m.brand;
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3">
        <PhotoInput name="image" required />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "읽는 중…" : "택 사진 읽기"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "read" && (
        <form
          ref={formRef}
          action={createFromTagAction}
          className="flex flex-col gap-3 rounded-lg border bg-secondary/30 p-4"
        >
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <input type="hidden" name="imageUrl" value={state.imageUrl} />

          {state.matches && state.matches.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                이 제품인가요? (탭하면 채워져요)
              </p>
              {state.matches.map((m, i) => (
                <button
                  key={`${m.productUrl ?? m.title}-${i}`}
                  type="button"
                  onClick={() => applyMatch(m)}
                  className="flex items-center gap-3 rounded-md border bg-background p-2 text-left transition-colors hover:border-foreground/30"
                >
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="size-10 shrink-0 rounded border bg-background object-contain"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded bg-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        m.brand,
                        m.priceKrw
                          ? `${m.priceKrw.toLocaleString("ko-KR")}원`
                          : null,
                        m.mallName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <Field label="브랜드" name="brand" defaultValue={state.brand} />
          <Field
            label="상품명"
            name="productName"
            defaultValue={state.productName}
          />
          <Field label="사이즈" name="size" defaultValue={state.size} />
          <Field label="소재" name="material" defaultValue={state.material} />
          <Button type="submit" size="lg">
            옷장에 등록
          </Button>
        </form>
      )}
    </div>
  );
}
