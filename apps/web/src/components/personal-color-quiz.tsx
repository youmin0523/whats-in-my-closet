"use client";

import { useActionState, useState } from "react";
import {
  savePersonalColorAction,
  type SavePcState,
} from "@/server/actions/personal-color";
import { Button } from "@/components/ui/button";

type Season = "spring" | "summer" | "fall" | "winter";

const PALETTES: Record<Season, string[]> = {
  spring: ["#FFB7A5", "#FFD58A", "#F7E1A0", "#A8D5A2", "#FF9E7A"],
  summer: ["#A7C7E7", "#CDB4DB", "#F4A6C0", "#B5D8D1", "#9AB7D3"],
  fall: ["#B5651D", "#8A6D3B", "#6B8E23", "#C08457", "#7E5A3C"],
  winter: ["#0F4C81", "#C81D52", "#1B1B3A", "#2E8B9E", "#111111"],
};
const SEASON_KO: Record<Season, string> = {
  spring: "봄 웜",
  summer: "여름 쿨",
  fall: "가을 웜",
  winter: "겨울 쿨",
};

function seasonOf(undertone: string, value: string): Season {
  if (undertone === "warm") return value === "light" ? "spring" : "fall";
  return value === "light" ? "summer" : "winter";
}

const QUESTIONS = [
  {
    key: "undertone",
    q: "손목 안쪽 혈관 색에 더 가까운 건?",
    a: [
      ["warm", "초록빛"],
      ["cool", "푸른빛"],
    ],
  },
  {
    key: "value",
    q: "더 잘 어울리는 톤은?",
    a: [
      ["light", "밝고 연한 색"],
      ["deep", "어둡고 진한 색"],
    ],
  },
  {
    key: "chroma",
    q: "더 잘 어울리는 채도는?",
    a: [
      ["bright", "선명한 색"],
      ["muted", "차분한 색"],
    ],
  },
] as const;

const initial: SavePcState = { status: "idle", message: "" };

export function PersonalColorQuiz() {
  const [ans, setAns] = useState<Record<string, string>>({});
  const [save, saveAction, saving] = useActionState(
    savePersonalColorAction,
    initial,
  );

  const done = QUESTIONS.every((q) => ans[q.key]);
  const season = done ? seasonOf(ans.undertone!, ans.value!) : null;

  return (
    <div className="flex flex-col gap-6">
      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="mb-2 text-sm font-medium">{q.q}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.a.map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setAns((p) => ({ ...p, [q.key]: val }))}
                className={`rounded-md border px-4 py-3 text-sm transition-colors ${
                  ans[q.key] === val
                    ? "border-primary bg-primary/10"
                    : "hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {season && (
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">내 퍼스널컬러</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {SEASON_KO[season]}
          </p>
          <div className="mt-4 flex gap-2">
            {PALETTES[season].map((c) => (
              <span
                key={c}
                className="h-9 w-9 rounded-full border"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <form action={saveAction} className="mt-5">
            <input type="hidden" name="undertone" value={ans.undertone} />
            <input type="hidden" name="value" value={ans.value} />
            <input type="hidden" name="chroma" value={ans.chroma} />
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중…" : "저장하고 추천에 반영"}
            </Button>
          </form>
          {save.status !== "idle" && (
            <p className="mt-2 text-sm text-muted-foreground">{save.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
