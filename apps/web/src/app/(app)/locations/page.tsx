import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import {
  createClosetAction,
  createContainerAction,
} from "@/server/actions/locations";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const q = ((await searchParams).q ?? "").trim();
  const closets = dbConfigured
    ? await api.locations.closets().catch(() => [])
    : [];
  const results =
    dbConfigured && q
      ? await api.locations.find({ query: q }).catch(() => [])
      : [];
  const containersByCloset = await Promise.all(
    closets.map((c) =>
      api.locations.containers({ closetId: c.id }).catch(() => []),
    ),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">옷 위치 찾기</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            어디 뒀더라?
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/locations/map"
            className="text-sm font-medium text-primary hover:opacity-80"
          >
            2D 배치도
          </Link>
          <Link
            href="/closet"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            옷장 →
          </Link>
        </div>
      </div>

      {/* where is X */}
      <form method="get" className="mt-8 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="옷 이름으로 찾기 (예: 네이비 니트)"
          className={`${inputClass} flex-1`}
        />
        <Button type="submit">찾기</Button>
      </form>

      {!dbConfigured && (
        <p className="mt-6 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          DB 연결 후 옷마다 위치(옷장·서랍·박스)를 지정하고 검색할 수 있어요.
        </p>
      )}

      {q && (
        <div className="mt-6">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              &lsquo;{q}&rsquo; 검색 결과가 없어요.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {results.map((r) => (
                <li
                  key={r.garmentId}
                  className="flex items-center gap-3 p-3"
                >
                  {r.thumbnailUrl ? (
                    <Image
                      src={r.thumbnailUrl}
                      alt={r.name ?? "옷"}
                      width={48}
                      height={48}
                      className="size-12 rounded-md border bg-background object-contain p-1"
                    />
                  ) : (
                    <div className="size-12 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.name ?? "이름 없음"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      📍 {r.note ?? "위치 미지정"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* closets + containers */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold tracking-tight">내 옷장 · 수납</h2>
        <Link
          href="/locations/build"
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          입면으로 옷장 만들기 →
          <span className="text-xs font-normal text-muted-foreground">
            2D·3D 자동 생성
          </span>
        </Link>

        <div className="mt-4 flex flex-col gap-4">
          {closets.map((c, ci) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{c.name}</p>
              {(containersByCloset[ci] ?? []).length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(containersByCloset[ci] ?? []).map((ct) => (
                    <li
                      key={ct.id}
                      className="rounded-full border bg-secondary/50 px-3 py-1 text-xs"
                    >
                      {ct.name}
                    </li>
                  ))}
                </ul>
              )}
              <form action={createContainerAction} className="mt-3 flex gap-2">
                <input type="hidden" name="closetId" value={c.id} />
                <input
                  name="name"
                  placeholder="서랍·칸 이름 (예: 2번 서랍)"
                  className={`${inputClass} flex-1`}
                />
                <Button type="submit" variant="outline" size="sm">
                  칸 추가
                </Button>
              </form>
            </div>
          ))}
        </div>

        <form action={createClosetAction} className="mt-4 flex gap-2">
          <input
            name="name"
            placeholder="새 옷장 이름 (예: 안방 옷장)"
            className={`${inputClass} flex-1`}
          />
          <Button type="submit" variant="outline">
            옷장 추가
          </Button>
        </form>
      </div>
    </div>
  );
}
