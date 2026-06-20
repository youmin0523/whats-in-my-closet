"use client";

import { useState } from "react";

/**
 * Korean-labeled file picker. The native <input type="file"> shows English
 * ("Choose File / No file chosen") that can't be relabeled via CSS, so we hide
 * it (sr-only — still focusable + form-submittable + Playwright-targetable) and
 * drive it from a styled <label>, showing the chosen filename(s) in Korean.
 *
 * Shows an instant client-side preview (URL.createObjectURL) the moment a photo
 * is picked — no waiting on the upload round-trip.
 */
export function PhotoInput({
  name,
  multiple = false,
  required = false,
}: {
  name: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background p-2 text-sm transition-colors hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0 rounded-md border bg-secondary px-3 py-1.5 font-medium">
          사진 선택
        </span>
        <span className="truncate text-muted-foreground">
          {label ||
            (multiple ? "여러 장 한꺼번에 골라도 돼요" : "아직 고른 사진이 없어요")}
        </span>
        <input
          type="file"
          name={name}
          accept="image/*"
          multiple={multiple}
          required={required}
          onChange={(e) => {
            previews.forEach((u) => URL.revokeObjectURL(u));
            const arr = e.target.files ? Array.from(e.target.files) : [];
            setLabel(
              arr.length === 0
                ? ""
                : arr.length === 1
                  ? (arr[0]?.name ?? "")
                  : `${arr.length}장 선택됨`,
            );
            setPreviews(arr.slice(0, 8).map((f) => URL.createObjectURL(f)));
          }}
          className="sr-only"
        />
      </label>

      {previews.length > 0 && (
        <div
          className={
            previews.length === 1
              ? "max-w-[180px]"
              : "grid grid-cols-4 gap-2 sm:grid-cols-6"
          }
        >
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt="고른 사진 미리보기"
              className="aspect-square w-full rounded-md border bg-background object-contain p-1"
            />
          ))}
        </div>
      )}
    </div>
  );
}
