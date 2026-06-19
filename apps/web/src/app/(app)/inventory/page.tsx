import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

const SEASON_KO: Record<string, string> = {
  spring: "봄",
  summer: "여름",
  fall: "가을",
  winter: "겨울",
};

const COLOR_KO: Record<string, string> = {
  white: "화이트",
  black: "블랙",
  gray: "그레이",
  beige: "베이지",
  brown: "브라운",
  red: "레드",
  orange: "오렌지",
  yellow: "옐로우",
  green: "그린",
  blue: "블루",
  navy: "네이비",
  purple: "퍼플",
  pink: "핑크",
};

const COLOR_HEX: Record<string, string> = {
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#9CA3AF",
  beige: "#E8DCC0",
  brown: "#5C4033",
  red: "#DC2626",
  orange: "#F97316",
  yellow: "#EAB308",
  green: "#16A34A",
  blue: "#2563EB",
  navy: "#1E2A52",
  purple: "#7C3AED",
  pink: "#EC4899",
};

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const data = dbConfigured
    ? await api.inventory.counts()
    : ({
        total: 0,
        byCategory: [],
        bySubcategory: [],
        bySeason: [],
        byColor: [],
      } as Awaited<ReturnType<typeof api.inventory.counts>>);

  const colorTotal = data.byColor.reduce((s, c) => s + c.items, 0) || 1;

  const leastWorn = dbConfigured
    ? await api.garments.leastWorn({ limit: 8 }).catch(() => [])
    : [];

  const duplicates = dbConfigured
    ? await api.inventory.duplicates().catch(() => [])
    : [];

  const subGroups = new Map<
    string,
    { subKo: string; subSlug: string; items: number }[]
  >();
  for (const s of data.bySubcategory) {
    const k = s.categoryKo ?? "기타";
    const arr = subGroups.get(k) ?? [];
    arr.push({ subKo: s.subKo, subSlug: s.subSlug, items: s.items });
    subGroups.set(k, arr);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
      <div className="flex items-end justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">옷장 안을 들여다보기</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            지금 내 옷장
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/closet/3d"
            className="text-sm font-medium text-primary hover:opacity-80"
          >
            3D로 보기
          </Link>
          <Link
            href="/closet"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            옷장 →
          </Link>
        </div>
      </div>

      <div className="mt-8 flex items-baseline gap-3">
        <span className="text-5xl font-semibold tracking-tight tabular-nums">
          {data.total}
        </span>
        <span className="text-muted-foreground">벌 보유</span>
      </div>

      {!dbConfigured && (
        <p className="mt-6 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          DB 연결 후 실제 수량이 집계됩니다. (HANDOFF.md 참고)
        </p>
      )}

      {data.byCategory.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-4">
          {data.byCategory.map((c) => (
            <div key={c.slug ?? "uncategorized"} className="bg-card p-5">
              <p className="text-sm text-muted-foreground">
                {c.nameKo ?? "미분류"}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                {c.units}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {c.countsAsPair ? "켤레" : "벌"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-lg font-semibold tracking-tight">중복 주의</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            같은 종류·비슷한 색을 여러 벌 가지고 있어요. 사기 전에 확인하세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {duplicates.map((d, i) => {
              const params = new URLSearchParams();
              if (d.categorySlug) params.set("cat", d.categorySlug);
              if (d.family) params.set("color", d.family);
              return (
                <Link
                  key={`${d.subKo}-${d.family}-${i}`}
                  href={`/closet?${params.toString()}`}
                  className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:border-foreground/30"
                >
                  <span
                    className="size-3 rounded-full border"
                    style={{
                      backgroundColor: COLOR_HEX[d.family ?? ""] ?? "#cccccc",
                    }}
                  />
                  {COLOR_KO[d.family ?? ""] ?? ""} {d.subKo}{" "}
                  <b className="tabular-nums">{d.n}벌</b>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {data.bySeason.some((s) => s.items > 0) && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">계절별</h2>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {data.bySeason.map((s) => (
              <div
                key={s.season}
                className="rounded-lg border bg-card p-4 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  {SEASON_KO[s.season] ?? s.season}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {s.items}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.byColor.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">색상별</h2>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full border bg-muted">
            {data.byColor.map((c) => (
              <div
                key={c.family ?? "x"}
                style={{
                  width: `${(c.items / colorTotal) * 100}%`,
                  backgroundColor: COLOR_HEX[c.family ?? ""] ?? "#cccccc",
                }}
                title={`${COLOR_KO[c.family ?? ""] ?? c.family} ${c.items}`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.byColor.map((c) => (
              <span
                key={c.family ?? "x"}
                className="flex items-center gap-1.5 rounded-full border bg-secondary/40 px-3 py-1 text-sm"
              >
                <span
                  className="size-3 rounded-full border"
                  style={{
                    backgroundColor: COLOR_HEX[c.family ?? ""] ?? "#cccccc",
                  }}
                />
                {COLOR_KO[c.family ?? ""] ?? c.family}{" "}
                <b className="tabular-nums">{c.items}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.bySubcategory.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">세부 분류</h2>
          <div className="mt-4 flex flex-col gap-4">
            {[...subGroups.entries()].map(([cat, subs]) => (
              <div key={cat}>
                <p className="text-sm text-muted-foreground">{cat}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {subs.map((s) => (
                    <span
                      key={s.subSlug}
                      className="rounded-full border bg-secondary/40 px-3 py-1 text-sm"
                    >
                      {s.subKo} <b className="tabular-nums">{s.items}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {leastWorn.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-lg font-semibold tracking-tight">잘 안 입는 옷</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            착용이 적은 옷부터. 정리(기부·판매)를 고려해보세요.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {leastWorn.map((g) => (
              <Link
                key={g.id}
                href={`/closet/${g.id}`}
                className="overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
              >
                {g.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.thumbnailUrl}
                    alt={g.name ?? "옷"}
                    className="aspect-square w-full bg-background object-contain p-1"
                  />
                ) : (
                  <div className="aspect-square w-full bg-muted" />
                )}
                <p className="px-2 pb-2 text-xs tabular-nums text-muted-foreground">
                  착용 {g.wears}회
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
