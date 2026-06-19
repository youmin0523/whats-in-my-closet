import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { Closet3D, type Item3D, type Unit3D } from "@/components/closet-3d";

const PALETTE = [
  "#5e6a4c",
  "#9c5b43",
  "#3a4a63",
  "#b08968",
  "#6b705c",
  "#a5a58d",
  "#7d8597",
  "#cb997e",
];

export const metadata = { title: "3D 옷장" };

export default async function Closet3DPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const rows = dbConfigured ? await api.garments.scene3d().catch(() => []) : [];

  // Group garments by closet → container; unplaced items go to `loose`.
  type Bin = {
    id: number;
    name: string;
    items: Item3D[];
    type?: string | null;
    col?: number | null;
    row?: number | null;
  };
  type Acc = {
    id: number;
    name: string;
    bins: Map<number, Bin>;
    looseItems: Item3D[];
  };
  const unitMap = new Map<number, Acc>();
  const loose: Item3D[] = [];

  rows.forEach((r, i) => {
    const item: Item3D = {
      id: r.id,
      label: r.name ?? "옷",
      color: r.hex ?? PALETTE[i % PALETTE.length]!,
    };
    if (r.closetId == null) {
      loose.push(item);
      return;
    }
    let u = unitMap.get(r.closetId);
    if (!u) {
      u = {
        id: r.closetId,
        name: r.closetName ?? "옷장",
        bins: new Map(),
        looseItems: [],
      };
      unitMap.set(r.closetId, u);
    }
    if (r.containerId == null) {
      u.looseItems.push(item);
      return;
    }
    let b = u.bins.get(r.containerId);
    if (!b) {
      const pos = r.containerPosition as { col: number; row: number } | null;
      b = {
        id: r.containerId,
        name: r.containerName ?? "칸",
        items: [],
        type: r.containerType,
        col: pos?.col ?? null,
        row: pos?.row ?? null,
      };
      u.bins.set(r.containerId, b);
    }
    b.items.push(item);
  });

  const units: Unit3D[] = [...unitMap.values()].map((u) => ({
    id: u.id,
    name: u.name,
    bins: [
      ...u.bins.values(),
      ...(u.looseItems.length
        ? [{ id: -u.id - 1000, name: "기타", items: u.looseItems }]
        : []),
    ],
  }));

  // Demo fallback when there's nothing yet.
  const looseOrDemo: Item3D[] =
    units.length === 0 && loose.length === 0
      ? Array.from({ length: 12 }, (_, i) => ({
          id: -1 - i,
          label: "데모",
          color: PALETTE[i % PALETTE.length]!,
        }))
      : loose;

  const hasData = units.length > 0 || loose.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-10">
      <div className="flex items-end justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">내 옷장보기</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            3D로 둘러보기
          </h1>
        </div>
        <Link
          href="/locations/map"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          2D 배치도 →
        </Link>
      </div>

      <div className="mt-8">
        <Closet3D units={units} loose={looseOrDemo} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        드래그로 돌려보고, 스크롤로 확대·축소하세요.
        {units.length > 0
          ? " 옷장·칸별로 실제 위치에 배치돼 있어요."
          : hasData
            ? " 위치를 지정하면 옷장·칸별로 배치됩니다. (지금은 한 칸에 모아 표시)"
            : " (지금은 예시 — 옷을 등록하고 위치를 지정하면 옷장·칸별로 배치됩니다.)"}
      </p>
    </div>
  );
}
