import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import {
  createClosetAction,
  createContainerAction,
  deleteClosetAction,
  deleteContainerAction,
  renameClosetAction,
} from "@/server/actions/locations";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";

const inputClass =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const metadata = { title: "옷 위치" };

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
          DB를 연결하면 옷마다 위치(옷장·서랍·박스)를 적어두고 찾아볼 수 있어요.
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.name ?? "이름 없음"}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      {r.note ?? "위치 미지정"}
                    </p>
                  </div>
                  {r.containerId ? (
                    <Link
                      href={`/closet/3d?c=${r.containerId}`}
                      className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      3D에서 보기
                    </Link>
                  ) : null}
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
            2D·3D 함께 만들어져요
          </span>
        </Link>

        <div className="mt-4 flex flex-col gap-4">
          {closets.map((c, ci) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <form
                  action={renameClosetAction}
                  className="flex flex-1 items-center gap-2"
                >
                  <input type="hidden" name="closetId" value={c.id} />
                  <input
                    name="name"
                    defaultValue={c.name}
                    aria-label="옷장 이름"
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-medium outline-none hover:border-input focus-visible:border-input focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    이름 저장
                  </button>
                </form>
                <form action={deleteClosetAction}>
                  <input type="hidden" name="closetId" value={c.id} />
                  <ConfirmButton message={`'${c.name}' 옷장을 삭제할까요? 안에 둔 옷은 미분류로 돌아갑니다.`}>
                    옷장 삭제
                  </ConfirmButton>
                </form>
              </div>

              {(containersByCloset[ci] ?? []).length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(containersByCloset[ci] ?? []).map((ct) => (
                    <li
                      key={ct.id}
                      className="flex items-center gap-1.5 rounded-full border bg-secondary/50 py-1 pl-3 pr-1.5 text-xs"
                    >
                      {ct.name}
                      <form action={deleteContainerAction} className="flex">
                        <input
                          type="hidden"
                          name="containerId"
                          value={ct.id}
                        />
                        <ConfirmButton
                          message={`'${ct.name}' 칸을 삭제할까요?`}
                          aria-label="칸 삭제"
                          className="leading-none"
                        >
                          ×
                        </ConfirmButton>
                      </form>
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
