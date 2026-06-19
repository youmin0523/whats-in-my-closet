"use client";

import { useTransition } from "react";
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

  const dropTo =
    (closetId: number | null, containerId: number | null) =>
    (e: React.DragEvent) => {
      e.preventDefault();
      const id = Number(e.dataTransfer.getData("text/plain"));
      if (id) start(() => moveGarment(id, closetId, containerId));
    };

  const hasClosets = data.closets.length > 0;

  return (
    <div className={cn("flex flex-col gap-6", pending && "opacity-70")}>
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
                onDrop={dropTo(c.id, ct.id)}
              >
                {ct.garments.map((g) => (
                  <Thumb key={g.garmentId} g={g} />
                ))}
              </DropCell>
            ))}

            {/* closet-level (no specific container) */}
            <DropCell
              title="이 옷장"
              hint="칸 미지정"
              count={c.loose.length}
              onDrop={dropTo(c.id, null)}
            >
              {c.loose.map((g) => (
                <Thumb key={g.garmentId} g={g} />
              ))}
            </DropCell>
          </div>

          {c.containers.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              칸이 없어요 —{" "}
              <a href="/locations" className="text-primary hover:opacity-80">
                위치 관리
              </a>
              에서 서랍·박스를 추가하면 여기에 칸별로 배치할 수 있어요.
            </p>
          )}
        </section>
      ))}

      {/* unassigned tray */}
      <DropCell
        title="미분류"
        hint="아직 위치가 없는 옷 — 위 칸으로 끌어다 놓으세요"
        count={data.unassigned.length}
        onDrop={dropTo(null, null)}
        wide
      >
        {data.unassigned.length === 0 ? (
          <p className="text-xs text-muted-foreground">전부 배치됐어요.</p>
        ) : (
          data.unassigned.map((g) => <Thumb key={g.garmentId} g={g} />)
        )}
      </DropCell>
    </div>
  );
}

function Thumb({ g }: { g: Item }) {
  return (
    <div
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData("text/plain", String(g.garmentId))
      }
      title={g.name ?? "옷"}
      className="cursor-grab touch-none active:cursor-grabbing"
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
    </div>
  );
}

function DropCell({
  title,
  hint,
  count,
  onDrop,
  children,
  wide,
}: {
  title: string;
  hint?: string;
  count: number;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "min-h-[96px] rounded-lg border border-dashed bg-background/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40",
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
