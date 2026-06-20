"use client";

import { useState } from "react";
import { Columns2, X } from "lucide-react";
import { buildClosetAction } from "@/server/actions/build-closet";
import { Button } from "@/components/ui/button";

type CellType = "shelf" | "rod" | "drawer" | "cell";
type Row = CellType[]; // one shelf-level, split into 1–3 cells left→right
type Section = Row[]; // one vertical column, rows top→bottom

const MAX_SPLIT = 3;

const KO: Record<CellType, string> = {
  shelf: "선반",
  rod: "행거",
  drawer: "서랍",
  cell: "칸",
};

const PRESETS: { key: string; label: string; sections: Section[] }[] = [
  {
    key: "single",
    label: "단문형",
    sections: [[["rod"], ["shelf"], ["shelf"], ["drawer"]]],
  },
  {
    key: "double",
    label: "양문형",
    sections: [
      [["rod"], ["shelf"], ["shelf"]],
      [["shelf"], ["shelf"], ["drawer", "drawer"]],
    ],
  },
  {
    key: "split",
    label: "선반 분할",
    sections: [[["rod"], ["shelf", "shelf"], ["shelf", "shelf", "shelf"], ["drawer", "drawer"]]],
  },
  {
    key: "triple",
    label: "3열장",
    sections: [
      [["rod"], ["shelf"]],
      [["shelf"], ["shelf"], ["shelf"]],
      [["rod"], ["drawer"], ["drawer"]],
    ],
  },
  { key: "drawers", label: "서랍장", sections: [[["drawer"], ["drawer"], ["drawer"], ["drawer"]]] },
];

const clone = (s: Section[]): Section[] => s.map((c) => c.map((r) => [...r]));

export function ClosetBuilder() {
  const [name, setName] = useState("");
  const [sections, setSections] = useState<Section[]>(clone(PRESETS[1]!.sections));

  // add a new shelf-level (row) at the bottom of a column
  const addRow = (col: number, type: CellType) =>
    setSections((s) =>
      s.map((c, i) => (i === col ? [...c, [type]] : c)),
    );
  // split a shelf-level horizontally — add a cell to its right (same type)
  const splitRow = (col: number, row: number) =>
    setSections((s) =>
      s.map((c, i) =>
        i !== col
          ? c
          : c.map((r, ri) =>
              ri === row && r.length < MAX_SPLIT
                ? [...r, r[r.length - 1] ?? "shelf"]
                : r,
            ),
      ),
    );
  const removeCell = (col: number, row: number, sub: number) =>
    setSections((s) =>
      s.map((c, i) =>
        i !== col
          ? c
          : c
              .map((r, ri) => (ri === row ? r.filter((_, si) => si !== sub) : r))
              .filter((r) => r.length > 0),
      ),
    );
  const addCol = () => setSections((s) => [...s, [["shelf"]]]);
  const removeCol = (col: number) =>
    setSections((s) => (s.length > 1 ? s.filter((_, i) => i !== col) : s));

  const total = sections.reduce(
    (n, c) => n + c.reduce((m, r) => m + r.length, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="옷장 이름 (예: 안방 옷장)"
          className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">프리셋</span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSections(clone(p.sections))}
              className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* elevation editor — the front face of the closet */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          입면, 앞에서 본 옷장이에요. 열마다 위에서 아래로 칸을 쌓고, 선반이나
          서랍은 ⊞로 좌우로 나눌 수 있어요.
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {sections.map((rows, col) => (
            <div
              key={col}
              className="flex min-w-[150px] flex-1 flex-col gap-2 rounded-lg border bg-background/60 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {col + 1}열
                </span>
                <button
                  type="button"
                  onClick={() => removeCol(col)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  삭제
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {rows.map((row, ri) => (
                  <div key={ri} className="flex items-stretch gap-1">
                    <div className="flex flex-1 gap-1">
                      {row.map((type, sub) => (
                        <Cell
                          key={sub}
                          type={type}
                          onRemove={() => removeCell(col, ri, sub)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => splitRow(col, ri)}
                      disabled={row.length >= MAX_SPLIT}
                      aria-label="좌우로 나누기"
                      title="좌우로 나누기"
                      className="flex w-8 shrink-0 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                    >
                      <Columns2 className="size-4" />
                    </button>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    비어 있어요
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1">
                {(["rod", "shelf", "drawer", "cell"] as CellType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addRow(col, t)}
                    className="rounded border bg-secondary/50 px-1.5 py-1 text-[11px] transition-colors hover:bg-accent"
                  >
                    + {KO[t]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCol}
            className="min-w-[72px] rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            + 열
          </button>
        </div>
      </div>

      <form
        action={buildClosetAction}
        className="flex items-center justify-between gap-3"
      >
        <input type="hidden" name="name" value={name} />
        <input
          type="hidden"
          name="sections"
          value={JSON.stringify(
            sections.map((c) => c.map((r) => r.map((type) => ({ type })))),
          )}
        />
        <p className="text-sm text-muted-foreground">
          {sections.length}열 · {total}칸
        </p>
        <Button type="submit" size="lg" disabled={!name.trim() || total === 0}>
          옷장 만들기 →
        </Button>
      </form>
    </div>
  );
}

function Cell({ type, onRemove }: { type: CellType; onRemove: () => void }) {
  return (
    <div className="relative flex h-12 flex-1 items-center justify-center rounded-md border bg-secondary/40 text-[11px] text-muted-foreground">
      {type === "rod" && (
        <div className="absolute inset-x-2 top-1.5 h-1 rounded bg-foreground/30" />
      )}
      {type === "shelf" && (
        <div className="absolute inset-x-1 bottom-1 h-1.5 rounded bg-foreground/25" />
      )}
      {type === "drawer" && (
        <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded bg-foreground/30" />
      )}
      <span>{KO[type]}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="칸 삭제"
        className="absolute right-0 top-0 flex size-6 items-center justify-center text-muted-foreground hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
