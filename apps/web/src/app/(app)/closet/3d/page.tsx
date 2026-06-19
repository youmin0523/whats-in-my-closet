import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { Closet3D, type Item3D } from "@/components/closet-3d";

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

export default async function Closet3DPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const garments = dbConfigured
    ? await api.garments.list3d().catch(() => [])
    : [];

  const items: Item3D[] = garments.length
    ? garments.map((g, i) => ({
        id: g.id,
        label: g.name ?? "옷",
        color: g.hex ?? PALETTE[i % PALETTE.length]!,
      }))
    : Array.from({ length: 12 }, (_, i) => ({
        id: -1 - i,
        label: "데모",
        color: PALETTE[i % PALETTE.length]!,
      }));

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
          href="/inventory"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 인벤토리
        </Link>
      </div>

      <div className="mt-8">
        <Closet3D items={items} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        드래그로 돌려보고, 스크롤로 확대·축소하세요.
        {!garments.length &&
          " (지금은 예시 — 옷을 등록하면 내 옷들이 위치대로 배치됩니다.)"}
      </p>
    </div>
  );
}
