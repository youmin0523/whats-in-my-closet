"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";

export interface Item3D {
  id: number;
  label: string;
  color: string;
}
export interface Bin3D {
  id: number;
  name: string;
  items: Item3D[];
  type?: string | null;
  col?: number | null;
  row?: number | null;
  sub?: number | null; // horizontal position within a split shelf-level
}
export interface Unit3D {
  id: number;
  name: string;
  bins: Bin3D[];
}

const CELL_W = 1.3;
const CELL_H = 0.82;
const FRAME = 0.12;
const DEPTH = 1.4;
const UNIT_GAP = 0.9;

type Cell = {
  col: number;
  row: number;
  sub: number;
  subCount: number;
  bin: Bin3D;
};

/** Resolve a unit's bins into a grid of cells (col × row, with horizontal sub-split). */
function toCells(bins: Bin3D[]): { cells: Cell[]; cols: number; rows: number } {
  const positioned = bins.filter((b) => b.col != null && b.row != null);
  const extra = bins.filter((b) => b.col == null || b.row == null);
  const extraCol = positioned.length
    ? Math.max(...positioned.map((b) => b.col!)) + 1
    : 0;
  const raw = [
    ...positioned.map((b) => ({
      col: b.col!,
      row: b.row!,
      sub: b.sub ?? 0,
      bin: b,
    })),
    ...extra.map((b, i) => ({ col: extraCol, row: i, sub: 0, bin: b })),
  ];
  if (raw.length === 0)
    raw.push({ col: 0, row: 0, sub: 0, bin: { id: 0, name: "", items: [] } });

  // how many cells share each (col,row) — the horizontal split count
  const counts = new Map<string, number>();
  for (const c of raw) {
    const k = `${c.col}:${c.row}`;
    counts.set(k, Math.max(counts.get(k) ?? 0, c.sub + 1));
  }
  const cells = raw.map((c) => ({
    ...c,
    subCount: counts.get(`${c.col}:${c.row}`)!,
  }));
  const cols = Math.max(1, ...cells.map((c) => c.col + 1));
  const rows = Math.max(1, ...cells.map((c) => c.row + 1));
  return { cells, cols, rows };
}

/** Item card — stands on a shelf, hangs from a rod, or sits in a cubby. */
function Cards({ items, baseY, w }: { items: Item3D[]; baseY: number; w: number }) {
  const shown = items.slice(0, w > 0.9 ? 3 : 2);
  const cardW = Math.max(0.16, Math.min(0.3, w - 0.18));
  const span = w - cardW - 0.1;
  return (
    <>
      {shown.map((it, ci) => {
        const ix =
          shown.length <= 1
            ? 0
            : -span / 2 + (ci * span) / (shown.length - 1);
        return (
          <RoundedBox
            key={it.id}
            args={[cardW, 0.46, 0.05]}
            radius={0.04}
            position={[ix, baseY, 0.18]}
          >
            <meshStandardMaterial color={it.color} roughness={0.6} />
          </RoundedBox>
        );
      })}
    </>
  );
}

/** One cell of the elevation, drawn according to its container type. */
function Cell({ bin, cx, cy, w }: { bin: Bin3D; cx: number; cy: number; w: number }) {
  const type = bin.type ?? "cell";
  const top = cy + CELL_H / 2;
  const bottom = cy - CELL_H / 2;

  return (
    <group position={[cx, 0, 0]}>
      {/* shelf / cubby: plank at the bottom, clothes standing on it */}
      {(type === "shelf" || type === "cell") && (
        <>
          <RoundedBox
            args={[w - 0.06, 0.05, DEPTH - 0.15]}
            radius={0.015}
            position={[0, bottom + 0.02, 0]}
          >
            <meshStandardMaterial color="#d8ccb4" roughness={0.85} />
          </RoundedBox>
          <Cards items={bin.items} baseY={bottom + 0.27} w={w} />
        </>
      )}

      {/* rod: a bar near the top, clothes hanging down */}
      {type === "rod" && (
        <>
          <mesh position={[0, top - 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, w - 0.2, 12]} />
            <meshStandardMaterial color="#8a8170" metalness={0.4} roughness={0.5} />
          </mesh>
          <Cards items={bin.items} baseY={top - 0.36} w={w} />
        </>
      )}

      {/* drawer: a front face with a handle; contents implied */}
      {type === "drawer" && (
        <>
          <RoundedBox
            args={[w - 0.12, CELL_H - 0.12, 0.1]}
            radius={0.03}
            position={[0, cy, 0.16]}
          >
            <meshStandardMaterial color="#cabd9f" roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, cy + 0.08, 0.23]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, Math.max(0.2, w - 0.5), 10]} />
            <meshStandardMaterial color="#7a7263" metalness={0.4} roughness={0.5} />
          </mesh>
        </>
      )}

      {bin.name ? (
        <Html position={[0, bottom + 0.04, DEPTH / 2]} center distanceFactor={13}>
          <div className="whitespace-nowrap rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background">
            {bin.name}
            {bin.items.length ? ` · ${bin.items.length}` : ""}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function Unit({ unit, x }: { unit: Unit3D; x: number }) {
  const { cells, cols, rows } = toCells(unit.bins);
  const innerW = cols * CELL_W;
  const innerH = rows * CELL_H;
  const unitW = innerW + FRAME;
  const colLeft = (c: number) => -innerW / 2 + c * CELL_W; // left edge of column
  const topRowY = innerH / 2 - CELL_H / 2;
  const rowY = (r: number) => topRowY - r * CELL_H;
  const cy = 0.3; // lift whole unit a touch

  return (
    <group position={[x, cy, 0]}>
      {/* carcass: back + sides + top + bottom */}
      <RoundedBox args={[unitW, innerH + FRAME, 0.1]} radius={0.02} position={[0, 0, -DEPTH / 2]}>
        <meshStandardMaterial color="#cdbfa6" roughness={0.9} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[FRAME, innerH + FRAME, DEPTH]}
          radius={0.02}
          position={[(s * unitW) / 2, 0, 0]}
        >
          <meshStandardMaterial color="#bfae90" roughness={0.9} />
        </RoundedBox>
      ))}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[unitW, FRAME, DEPTH]}
          radius={0.02}
          position={[0, (s * (innerH + FRAME)) / 2, 0]}
        >
          <meshStandardMaterial color="#c6b89c" roughness={0.9} />
        </RoundedBox>
      ))}
      {/* vertical dividers between columns */}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <RoundedBox
          key={i}
          args={[0.04, innerH, DEPTH - 0.1]}
          radius={0.01}
          position={[-innerW / 2 + (i + 1) * CELL_W, 0, 0]}
        >
          <meshStandardMaterial color="#c6b89c" roughness={0.9} />
        </RoundedBox>
      ))}

      <Html position={[0, innerH / 2 + 0.5, 0]} center distanceFactor={11}>
        <div className="whitespace-nowrap rounded-full border bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
          {unit.name}
        </div>
      </Html>

      {cells.map((cell) => {
        const w = CELL_W / cell.subCount;
        const cx = colLeft(cell.col) + w * (cell.sub + 0.5);
        return (
          <Cell key={cell.bin.id} bin={cell.bin} cx={cx} cy={rowY(cell.row)} w={w} />
        );
      })}
    </group>
  );
}

export function Closet3D({ units, loose }: { units: Unit3D[]; loose: Item3D[] }) {
  const rack: Unit3D[] =
    units.length > 0
      ? [
          ...units,
          ...(loose.length
            ? [
                {
                  id: -1,
                  name: "미분류",
                  bins: [{ id: -1, name: "", items: loose }],
                },
              ]
            : []),
        ]
      : [
          {
            id: 0,
            name: "내 옷장",
            bins: [
              { id: 0, name: "행거", items: loose.slice(0, 3), type: "rod", col: 0, row: 0, sub: 0 },
              { id: 1, name: "선반", items: loose.slice(3, 5), type: "shelf", col: 0, row: 1, sub: 0 },
              // a horizontally split shelf — two cells share one shelf-level
              { id: 2, name: "선반", items: loose.slice(5, 7), type: "shelf", col: 1, row: 0, sub: 0 },
              { id: 3, name: "선반", items: loose.slice(7, 9), type: "shelf", col: 1, row: 0, sub: 1 },
              { id: 4, name: "서랍", items: loose.slice(9, 12), type: "drawer", col: 1, row: 1, sub: 0 },
            ],
          },
        ];

  // widths so we can lay units out without overlap
  const widths = rack.map((u) => {
    const { cols } = toCells(u.bins);
    return cols * CELL_W + FRAME;
  });
  const totalW =
    widths.reduce((a, b) => a + b, 0) + UNIT_GAP * (rack.length - 1);
  let cursor = -totalW / 2;
  const xs = widths.map((w) => {
    const x = cursor + w / 2;
    cursor += w + UNIT_GAP;
    return x;
  });
  const maxCols = Math.max(...widths.map((w) => w));

  const single = rack.length <= 1;
  // pull the camera back for wide layouts so nothing is cut off
  const camZ = Math.max(7.2, totalW * 0.95, maxCols * 1.6);
  return (
    <div className="h-[68vh] w-full overflow-hidden rounded-xl border bg-card">
      <Canvas camera={{ position: [0, 1.1, camZ], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 4]} intensity={1.15} />
          <directionalLight position={[-4, 2, 2]} intensity={0.35} />
          {rack.map((u, i) => (
            <Unit key={u.id} unit={u} x={xs[i]!} />
          ))}
          <OrbitControls
            enablePan={!single}
            minDistance={3.5}
            maxDistance={24}
            maxPolarAngle={Math.PI / 2}
            autoRotate={single}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
