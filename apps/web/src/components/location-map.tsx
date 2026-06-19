"use client";

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
  // Tap-to-move (mobile-friendly): tap a garment to select, then tap a cell.
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
          <a href="/locations" className="text-primary hover:opacity-80">
            위치 관리
          </a>
          에서 옷장과 칸(서랍·박스)을 먼저 추가하세요.
        </p>
      )}

      {data.closets.map((c) => (
        <section key={c.id} className="rounded-xl border bg-card p-4">
          <h3 className="font-medium tracking-tight">{c.name}</h3>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {c.containers.map((ct) => (
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

            <DropCell
              title="이 옷장"
              hint="칸 미지정"
              count={c.loose.length}
              armed={armed}
              onDrop={onDrop(c.id, null)}
              onTap={onTap(c.id, null)}
            >
              {c.loose.map((g) => (
                <Thumb
                  key={g.garmentId}
                  g={g}
                  selected={selected === g.garmentId}
                  onSelect={toggle}
                />
              ))}
            </DropCell>
          </div>

          {c.containers.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              칸이 없어요 —{" "}
              <a href="/locations" className="text-primary hover:opacity-80">
                위치 관리
              </a>
              에서 서랍·박스를 추가하면 칸별로 배치할 수 있어요.
            </p>
          )}
        </section>
      ))}

      {/* unassigned tray */}
      <DropCell
        title="미분류"
        hint="아직 위치가 없는 옷 — 드래그하거나, 탭해서 칸을 고르세요"
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
      title={g.name ?? "옷"}
      className={cn(
        "cursor-grab rounded-md ring-offset-2 ring-offset-background active:cursor-grabbing",
        selected && "ring-2 ring-primary",
      )}
    >
      {g.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={g.thumbnailUrl}
          alt={g.name ?? "옷"}
          className="size-12 rounded-md border bg-background object-contain p-0.5"
          draggable={false}
        />
      ) : (
        <div className="size-12 rounded-md border bg-muted" />
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
        "min-h-[96px] rounded-lg border border-dashed bg-background/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40",
        armed && "cursor-pointer border-primary/50 bg-primary/5",
        wide && "sm:min-h-[120px]",
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
