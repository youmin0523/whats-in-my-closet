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

export default async function Closet3DPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const hc = Number((await searchParams).c);
  const highlightId = hc > 0 ? hc : undefined;

  const dbConfigured = !!process.env.DATABASE_URL;
  // Structure (closets + ALL containers incl. empty, with position/type) comes
  // from locations.map; garment dominant colors come from scene3d. Merging both
  // means a freshly built—but empty—closet still renders its real layout.
  const [colorRows, map] = await Promise.all([
    dbConfigured ? api.garments.scene3d().catch(() => []) : [],
    dbConfigured ? api.locations.map().catch(() => null) : null,
  ]);

  const hexById = new Map<number, string>();
  colorRows.forEach((r) => {
    if (r.hex) hexById.set(r.id, r.hex);
  });
  let paletteCursor = 0;
  const toItem = (g: {
    garmentId: number;
    name: string | null;
  }): Item3D => ({
    id: g.garmentId,
    label: g.name ?? "옷",
    color: hexById.get(g.garmentId) ?? PALETTE[paletteCursor++ % PALETTE.length]!,
  });

  const units: Unit3D[] = (map?.closets ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    bins: [
      ...c.containers.map((ct) => ({
        id: ct.id,
        name: ct.name,
        type: ct.type,
        col: ct.position?.col ?? null,
        row: ct.position?.row ?? null,
        sub: ct.position?.sub ?? null,
        items: ct.garments.map(toItem),
      })),
      ...(c.loose.length
        ? [{ id: -c.id - 1000, name: "기타", items: c.loose.map(toItem) }]
        : []),
    ],
  }));
  const loose: Item3D[] = (map?.unassigned ?? []).map(toItem);

  // Demo fallback only when there's truly nothing yet.
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
          <p className="text-sm text-muted-foreground">내 옷장 보기</p>
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
        <Closet3D units={units} loose={looseOrDemo} highlightId={highlightId} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        드래그로 돌려보고, 스크롤로 확대·축소하세요.
        {units.length > 0
          ? " 옷장과 칸별로 실제 위치에 놓여 있어요."
          : hasData
            ? " 위치를 정하면 옷장과 칸별로 놓여요. 지금은 한 칸에 모아 보여줘요."
            : " 지금 보이는 건 예시예요. 옷을 등록하고 위치를 정하면 옷장과 칸별로 놓여요."}
      </p>
    </div>
  );
}
