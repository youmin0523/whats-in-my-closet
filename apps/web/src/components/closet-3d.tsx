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
}
export interface Unit3D {
  id: number;
  name: string;
  bins: Bin3D[];
}

const COLS = 4;
const SHELF_GAP = 0.74;
const UNIT_W = 2.9;
const UNIT_DEPTH = 1.55;
const UNIT_SPACING = 3.5;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out.length ? out : [[]];
}

/** One closet, rendered as a wardrobe whose shelves are its containers (drawers). */
function Unit({ unit, x }: { unit: Unit3D; x: number }) {
  const bins = unit.bins.length
    ? unit.bins.slice(0, 5)
    : [{ id: 0, name: "", items: [] as Item3D[] }];
  const n = bins.length;
  const height = n * SHELF_GAP + 0.55;
  const topY = ((n - 1) * SHELF_GAP) / 2 + 0.3;

  return (
    <group position={[x, 0, 0]}>
      {/* back + side panels */}
      <RoundedBox args={[UNIT_W, height, 0.12]} radius={0.03} position={[0, 0.3, -0.8]}>
        <meshStandardMaterial color="#cdbfa6" roughness={0.9} />
      </RoundedBox>
      <RoundedBox
        args={[0.12, height, UNIT_DEPTH]}
        radius={0.03}
        position={[-UNIT_W / 2, 0.3, 0]}
      >
        <meshStandardMaterial color="#bfae90" roughness={0.9} />
      </RoundedBox>
      <RoundedBox
        args={[0.12, height, UNIT_DEPTH]}
        radius={0.03}
        position={[UNIT_W / 2, 0.3, 0]}
      >
        <meshStandardMaterial color="#bfae90" roughness={0.9} />
      </RoundedBox>

      {/* closet name */}
      <Html position={[0, topY + 0.85, 0]} center distanceFactor={10}>
        <div className="whitespace-nowrap rounded-full border bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
          {unit.name}
        </div>
      </Html>

      {bins.map((bin, si) => {
        const y = topY - si * SHELF_GAP;
        const items = bin.items.slice(0, COLS);
        const span = UNIT_W - 1.0;
        return (
          <group key={bin.id}>
            <RoundedBox
              args={[UNIT_W, 0.06, UNIT_DEPTH - 0.1]}
              radius={0.02}
              position={[0, y - 0.32, 0]}
            >
              <meshStandardMaterial color="#d8ccb4" roughness={0.85} />
            </RoundedBox>
            {bin.name ? (
              <Html
                position={[-UNIT_W / 2 + 0.05, y - 0.02, 0.78]}
                distanceFactor={12}
              >
                <div className="whitespace-nowrap rounded bg-foreground/75 px-1.5 py-0.5 text-[10px] text-background">
                  {bin.name}
                </div>
              </Html>
            ) : null}
            {items.map((it, ci) => {
              const ix =
                items.length <= 1
                  ? 0
                  : -span / 2 + (ci * span) / (items.length - 1);
              return (
                <RoundedBox
                  key={it.id}
                  args={[0.42, 0.54, 0.06]}
                  radius={0.05}
                  position={[ix, y, 0.12]}
                >
                  <meshStandardMaterial color={it.color} roughness={0.6} />
                </RoundedBox>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export function Closet3D({
  units,
  loose,
}: {
  units: Unit3D[];
  loose: Item3D[];
}) {
  // Real closets → render side by side (+ a "미분류" rack for unplaced items).
  // No closets yet → a single rack with the (demo or unplaced) items.
  const rack: Unit3D[] =
    units.length > 0
      ? [
          ...units,
          ...(loose.length
            ? [
                {
                  id: -1,
                  name: "미분류",
                  bins: chunk(loose, COLS).map((items, i) => ({
                    id: -1 - i,
                    name: "",
                    items,
                  })),
                },
              ]
            : []),
        ]
      : [
          {
            id: 0,
            name: "내 옷장",
            bins: chunk(loose, COLS).map((items, i) => ({
              id: i,
              name: `${i + 1}칸`,
              items,
            })),
          },
        ];

  const total = rack.length;
  return (
    <div className="h-[68vh] w-full overflow-hidden rounded-xl border bg-card">
      <Canvas camera={{ position: [0, 1.3, 6.8], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 4]} intensity={1.15} />
          <directionalLight position={[-4, 2, 2]} intensity={0.35} />
          {rack.map((u, i) => (
            <Unit key={u.id} unit={u} x={(i - (total - 1) / 2) * UNIT_SPACING} />
          ))}
          <OrbitControls
            enablePan={total > 1}
            minDistance={3.5}
            maxDistance={16}
            maxPolarAngle={Math.PI / 2}
            autoRotate={total <= 1}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
