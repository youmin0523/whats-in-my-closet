import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { LocationMap, type MapData } from "@/components/location-map";

const EMPTY: MapData = { closets: [], unassigned: [] };

export default async function LocationMapPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const data = dbConfigured
    ? await api.locations.map().catch(() => EMPTY)
    : EMPTY;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">옷장 배치도</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            끌어다 위치 정하기
          </h1>
        </div>
        <Link
          href="/locations"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 위치 찾기
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        옷 썸네일을 원하는 옷장·칸으로 끌어다 놓으면 위치가 저장돼요.
      </p>

      {!dbConfigured && (
        <p className="mt-4 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          DB 연결 후 실제 옷·위치가 표시됩니다. (HANDOFF.md 참고)
        </p>
      )}

      <div className="mt-6">
        <LocationMap data={data} />
      </div>
    </div>
  );
}
