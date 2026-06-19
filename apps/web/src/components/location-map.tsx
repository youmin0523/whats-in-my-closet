"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { moveGarment } from "@/server/actions/location-map";
import { cn } from "@/lib/utils";

type Item = {
  garmentId: number;
  name: string | null;
  thumbnailUrl: string | null;
};
type Container = {
  id: number;
  name: string;
  type: string | null;
  position: { col: number; row: number; sub?: number } | null;
  garments: Item[];
};
type Closet = {
  id: number;
  name: string;
  loose: Item[];
  containers: Container[];
};
export type MapData = { closets: Closet[]; unassigned: Item[] };

export function LocationMap({ data }: { data: MapData }) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<number | null>(null);

  const move = (
    closetId: number | null,
    containerId: number | null,
    id: number,
  ) => {
    if (!id) return;
    start(() => moveGarment(id, closetId, containerId));
    setSelected(null);
  };
  const onDrop =
    (closetId: number | null, containerId: number | null) =>
    (e: React.DragEvent) => {
      e.preventDefault();
      move(closetId, containerId, Number(e.dataTransfer.getData("text/plain")));
    };
  const onTap =
    (closetId: number | null, containerId: number | null) => () => {
      if (selected != null) move(closetId, containerId, selected);
    };
  const toggle = (id: number) =>
    setSelected((prev) => (prev === id ? null : id));

  const armed = selected != null;
  const hasClosets = data.closets.length > 0;

  return (
    <div className={cn("flex flex-col gap-6", pending && "opacity-70")}>
      {armed && (
        <p className="sticky top-16 z-10 rounded-md border border-primary/50 bg-primary/10 p-2.5 text-center text-sm font-medium">
          옮길 칸을 탭하세요 ·{" "}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="underline"
          >
            취소
          </button>
        </p>
      )}

      {!hasClosets && (
        <p className="rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
          아직 옷장이 없어요.{" "}
          <a href="/locations/build" className="text-primary hover:opacity-80">
            입면으로 옷장 만들기
          </a>
          로 옷장 모양을 짜면 여기에 배치도가 그려져요.
        </p>
      )}

      {data.closets.map((c) => {
        // Group positioned containers into elevation columns → rows → cells
        // (a row may hold 2–3 cells side by side: a horizontally split shelf).
        const positioned = c.containers.filter((ct) => ct.position);
        const flat = c.containers.filter((ct) => !ct.position);
        const cols = new Map<number, Map<number, Container[]>>();
        for (const ct of positioned) {
          const { col, row } = ct.position!;
          let rowMap = cols.get(col);
          if (!rowMap) {
            rowMap = new Map();
            cols.set(col, rowMap);
          }
          const cell = rowMap.get(row) ?? [];
          cell.push(ct);
          rowMap.set(row, cell);
        }
        const colKeys = [...cols.keys()].sort((a, b) => a - b);

        return (
          <section key={c.id} className="rounded-xl border bg-card p-4">
            <h3 className="font-medium tracking-tight">{c.name}</h3>

            {colKeys.length > 0 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {colKeys.map((col) => {
                  const rowMap = cols.get(col)!;
                  const rowKeys = [...rowMap.keys()].sort((a, b) => a - b);
                  return (
                    <div
                      key={col}
                      className="flex min-w-[140px] flex-1 flex-col gap-1.5 rounded-lg border bg-background/40 p-1.5"
                    >
                      {rowKeys.map((row) => {
                        const cells = rowMap
                          .get(row)!
                          .sort(
                            (a, b) =>
                              (a.position!.sub ?? 0) - (b.position!.sub ?? 0),
                          );
                        return (
                          <div key={row} className="flex gap-1.5">
                            {cells.map((ct) => (
                              <ElevCell
                                key={ct.id}
                                ct={ct}
                                armed={armed}
                                onDrop={onDrop(c.id, ct.id)}
                                onTap={onTap(c.id, ct.id)}
                              >
                                {ct.garments.map((g) => (
                                  <Thumb
                                    key={g.garmentId}
                                    g={g}
                                    selected={selected === g.garmentId}
                                    onSelect={toggle}
                                  />
                                ))}
                              </ElevCell>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {flat.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {flat.map((ct) => (
                  <DropCell
                    key={ct.id}
                    title={ct.name}
                    hint={ct.type ?? "칸"}
                    count={ct.garments.length}
                    armed={armed}
                    onDrop={onDrop(c.id, ct.id)}
                    onTap={onTap(c.id, ct.id)}
                  >
                    {ct.garments.map((g) => (
                      <Thumb
                        key={g.garmentId}
                        g={g}
                        selected={selected === g.garmentId}
                        onSelect={toggle}
                      />
                    ))}
                  </DropCell>
                ))}
              </div>
            )}

            {/* Always offer a closet-level drop target for unassigned garments —
                even when every container is positioned (else loose items have
                nowhere to live / move out of). */}
            {(c.loose.length > 0 || c.containers.length === 0) && (
              <div className="mt-3">
                <DropCell
                  title="이 옷장"
                  hint="아직 칸을 안 정한 옷"
                  count={c.loose.length}
                  armed={armed}
                  onDrop={onDrop(c.id, null)}
                  onTap={onTap(c.id, null)}
                  wide
                >
                  {c.loose.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      칸을 탭해 옷을 넣어보세요.
                    </p>
                  ) : (
                    c.loose.map((g) => (
                      <Thumb
                        key={g.garmentId}
                        g={g}
                        selected={selected === g.garmentId}
                        onSelect={toggle}
                      />
                    ))
                  )}
                </DropCell>
              </div>
            )}

            {c.containers.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                아직 칸이 없어요.{" "}
                <a
                  href="/locations/build"
                  className="text-primary hover:opacity-80"
                >
                  입면으로 옷장 만들기
                </a>
에서 구조를 짜보세요.
              </p>
            )}
          </section>
        );
      })}

      <DropCell
        title="미분류"
        hint="아직 위치가 없는 옷이에요. 끌어다 놓거나 탭해서 칸을 고르세요"
        count={data.unassigned.length}
        armed={armed}
        onDrop={onDrop(null, null)}
        onTap={onTap(null, null)}
        wide
      >
        {data.unassigned.length === 0 ? (
          <p className="text-xs text-muted-foreground">전부 배치됐어요.</p>
        ) : (
          data.unassigned.map((g) => (
            <Thumb
              key={g.garmentId}
              g={g}
              selected={selected === g.garmentId}
              onSelect={toggle}
            />
          ))
        )}
      </DropCell>
    </div>
  );
}

/** An elevation cell — styled by container type (행거/선반/서랍/칸). */
function ElevCell({
  ct,
  armed,
  onDrop,
  onTap,
  children,
}: {
  ct: Container;
  armed: boolean;
  onDrop: (e: React.DragEvent) => void;
  onTap: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onTap}
      className={cn(
        "relative min-h-[58px] min-w-0 flex-1 rounded-md border bg-secondary/30 p-1.5 transition-colors hover:border-primary/50",
        armed && "cursor-pointer border-primary/50 bg-primary/5",
      )}
    >
      {ct.type === "rod" && (
        <div className="absolute inset-x-2 top-1 h-0.5 rounded bg-foreground/25" />
      )}
      {ct.type === "shelf" && (
        <div className="absolute inset-x-1 bottom-0.5 h-1 rounded bg-foreground/20" />
      )}
      {ct.type === "drawer" && (
        <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded bg-foreground/20" />
      )}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="truncate text-[11px] text-muted-foreground">
          {ct.name}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {ct.garments.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Thumb({
  g,
  selected,
  onSelect,
}: {
  g: Item;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData("text/plain", String(g.garmentId))
      }
      onClick={(e) => {
        e.stopPropagation();
        onSelect(g.garmentId);
      }}
      title={g.name ?? "이름 없는 옷"}
      aria-label={`${g.name ?? "이름 없는 옷"} — 탭해서 옮기기`}
      aria-pressed={selected}
      className={cn(
        "cursor-grab rounded-md ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        selected && "ring-2 ring-primary",
      )}
    >
      {g.thumbnailUrl ? (
        <Image
          src={g.thumbnailUrl}
          alt={g.name ?? "옷"}
          width={40}
          height={40}
          className="size-10 rounded-md border bg-background object-contain p-0.5"
          draggable={false}
        />
      ) : (
        <div className="size-10 rounded-md border bg-muted" />
      )}
    </button>
  );
}

function DropCell({
  title,
  hint,
  count,
  armed,
  onDrop,
  onTap,
  children,
  wide,
}: {
  title: string;
  hint?: string;
  count: number;
  armed: boolean;
  onDrop: (e: React.DragEvent) => void;
  onTap: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onTap}
      className={cn(
        "min-h-[88px] rounded-lg border border-dashed bg-background/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40",
        armed && "cursor-pointer border-primary/50 bg-primary/5",
        wide && "sm:min-h-[110px]",
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {hint && <p className="mb-2 text-[11px] text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
