import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { assignLocationAction } from "@/server/actions/assign-location";
import { logWearAction, setPriceAction } from "@/server/actions/wear";
import { Button } from "@/components/ui/button";
import { EditGarmentForm } from "@/components/edit-garment-form";

export default async function GarmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const garmentId = Number((await params).id);
  if (!Number.isFinite(garmentId)) notFound();

  const g = await api.garments.byId({ id: garmentId }).catch(() => null);
  if (!g) notFound();

  const similar = await api.similarity
    .similarTo({ garmentId, limit: 6 })
    .catch(() => ({ matches: [] as { garmentId: number; name: string | null; thumbnailUrl: string | null }[] }));
  const closets = await api.locations.closets().catch(() => []);
  const taxonomy = process.env.DATABASE_URL
    ? await api.system.taxonomy().catch(() => [])
    : [];

  const attrs = (
    [
      ["브랜드", g.brand],
      ["사이즈", g.size],
      ["소재", g.material],
      ["패턴", g.pattern],
      ["핏", g.fit],
    ] as [string, string | null][]
  ).filter((x): x is [string, string] => Boolean(x[1]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <Link
        href="/closet"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 옷장
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border bg-card">
          {g.thumbnailUrl ? (
            <div className="relative aspect-square w-full bg-background">
              <Image
                src={g.thumbnailUrl}
                alt={g.name ?? "옷"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-4"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-muted" />
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {g.name ?? "이름 없음"}
          </h1>
          {g.colors.length > 0 && (
            <div className="mt-3 flex gap-1.5">
              {g.colors.map((c) => (
                <span
                  key={c.id}
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}
          {attrs.length > 0 && (
            <dl className="mt-5 space-y-2">
              {attrs.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b pb-2 text-sm"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 rounded-lg border bg-secondary/30 p-4">
            <p className="text-sm font-medium">위치</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {g.location?.note ?? "아직 지정 안 됨"}
            </p>
            <form
              action={assignLocationAction}
              className="mt-3 flex flex-col gap-2"
            >
              <input type="hidden" name="garmentId" value={g.id} />
              <input
                name="note"
                defaultValue={g.location?.note ?? ""}
                placeholder="예: 안방 옷장 2번 서랍"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
              {closets.length > 0 && (
                <select
                  name="closetId"
                  defaultValue={g.location?.closetId ?? ""}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">옷장 선택 안 함</option>
                  {closets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <Button type="submit" variant="outline" size="sm">
                위치 저장
              </Button>
            </form>
          </div>

          <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
            <p className="text-sm font-medium">착용 &amp; 비용</p>
            <div className="mt-2 flex items-baseline gap-4 text-sm">
              <span>
                착용 <b className="tabular-nums">{g.wearCount}</b>회
              </span>
              {g.purchasePrice != null && (
                <span className="text-muted-foreground tabular-nums">
                  1회당{" "}
                  {(g.wearCount > 0
                    ? Math.round(g.purchasePrice / g.wearCount)
                    : g.purchasePrice
                  ).toLocaleString()}
                  원
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <form action={logWearAction}>
                <input type="hidden" name="garmentId" value={g.id} />
                <Button type="submit" size="sm">
                  오늘 입었어요
                </Button>
              </form>
              <form action={setPriceAction} className="flex gap-2">
                <input type="hidden" name="garmentId" value={g.id} />
                <input
                  name="price"
                  defaultValue={g.purchasePrice ?? ""}
                  inputMode="numeric"
                  placeholder="구매가 (원)"
                  className="h-9 w-36 rounded-md border bg-background px-3 text-sm"
                />
                <Button type="submit" variant="outline" size="sm">
                  저장
                </Button>
              </form>
            </div>
          </div>

          <details className="mt-4 rounded-lg border bg-secondary/30 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              기본 정보 수정
            </summary>
            <EditGarmentForm
              garment={{
                id: g.id,
                name: g.name,
                categoryId: g.categoryId,
                subcategoryId: g.subcategoryId,
                season: g.season,
                status: g.status,
              }}
              taxonomy={taxonomy}
            />
          </details>
        </div>
      </div>

      {similar.matches.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-lg font-semibold tracking-tight">비슷한 옷</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {similar.matches.map((m) => (
              <Link
                key={m.garmentId}
                href={`/closet/${m.garmentId}`}
                className="group overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
              >
                {m.thumbnailUrl ? (
                  <div className="relative aspect-square w-full bg-background">
                    <Image
                      src={m.thumbnailUrl}
                      alt={m.name ?? "옷"}
                      fill
                      sizes="(max-width: 768px) 33vw, 16vw"
                      className="object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-muted" />
                )}
                <p className="truncate px-2 py-1.5 text-xs text-muted-foreground group-hover:text-foreground">
                  {m.name ?? "이름 없음"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
