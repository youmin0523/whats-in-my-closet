"use client";

import { useState } from "react";

/**
 * Korean-labeled file picker. The native <input type="file"> shows English
 * ("Choose File / No file chosen") that can't be relabeled via CSS, so we hide
 * it (sr-only — still focusable + form-submittable + Playwright-targetable) and
 * drive it from a styled <label>, showing the chosen filename(s) in Korean.
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
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background p-2 text-sm transition-colors hover:border-foreground/30">
      <span className="shrink-0 rounded-md border bg-secondary px-3 py-1.5 font-medium">
        사진 선택
      </span>
      <span className="truncate text-muted-foreground">
        {label || (multiple ? "여러 장 선택 가능" : "선택된 파일 없음")}
      </span>
      <input
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        required={required}
        onChange={(e) => {
          const fs = e.target.files;
          setLabel(
            !fs || fs.length === 0
              ? ""
              : fs.length === 1
                ? (fs[0]?.name ?? "")
                : `${fs.length}장 선택됨`,
          );
        }}
        className="sr-only"
      />
    </label>
  );
}
