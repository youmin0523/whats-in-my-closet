"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";

export interface Item3D {
  id: number;
  label: string;
  color: string;
}

const SHELVES = [1.35, 0.25, -0.85]; // y positions, top → bottom
const COLS = 5;

function Wardrobe({ items }: { items: Item3D[] }) {
  const shown = items.slice(0, SHELVES.length * COLS);
  return (
    <group position={[0, 0, 0]}>
      {/* back + side panels */}
      <RoundedBox args={[3.3, 3.1, 0.12]} radius={0.03} position={[0, 0.3, -0.85]}>
        <meshStandardMaterial color="#cdbfa6" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.14, 3.1, 1.8]} radius={0.03} position={[-1.65, 0.3, 0]}>
        <meshStandardMaterial color="#bfae90" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.14, 3.1, 1.8]} radius={0.03} position={[1.65, 0.3, 0]}>
        <meshStandardMaterial color="#bfae90" roughness={0.9} />
      </RoundedBox>
      {/* shelves */}
      {SHELVES.map((y) => (
        <RoundedBox
          key={y}
          args={[3.3, 0.07, 1.7]}
          radius={0.02}
          position={[0, y - 0.32, 0]}
        >
          <meshStandardMaterial color="#d8ccb4" roughness={0.85} />
        </RoundedBox>
      ))}
      {/* garment cards */}
      {shown.map((it, idx) => {
        const shelf = Math.floor(idx / COLS);
        const col = idx % COLS;
        const x = -1.1 + col * 0.55;
        const y = SHELVES[shelf]!;
        return (
          <RoundedBox
            key={it.id}
            args={[0.44, 0.58, 0.07]}
            radius={0.05}
            position={[x, y, 0.1]}
          >
            <meshStandardMaterial color={it.color} roughness={0.6} />
          </RoundedBox>
        );
      })}
    </group>
  );
}

export function Closet3D({ items }: { items: Item3D[] }) {
  return (
    <div className="h-[68vh] w-full overflow-hidden rounded-xl border bg-card">
      <Canvas camera={{ position: [0, 1, 5.2], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 4]} intensity={1.15} />
          <directionalLight position={[-4, 2, 2]} intensity={0.35} />
          <Wardrobe items={items} />
          <OrbitControls
            enablePan={false}
            minDistance={3.2}
            maxDistance={9}
            maxPolarAngle={Math.PI / 2}
            autoRotate
            autoRotateSpeed={0.6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
