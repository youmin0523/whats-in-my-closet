import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATS: [string, string][] = [
  ["", "전체"],
  ["tops", "상의"],
  ["bottoms", "하의"],
  ["outerwear", "아우터"],
  ["dresses", "원피스"],
  ["shoes", "신발"],
  ["socks", "양말"],
  ["bags", "가방"],
  ["accessories", "액세서리"],
  ["headwear", "모자"],
  ["underwear", "이너웨어"],
];

const SEASONS: [string, string][] = [
  ["", "사계절"],
  ["spring", "봄"],
  ["summer", "여름"],
  ["fall", "가을"],
  ["winter", "겨울"],
];

// [slug, 한글, 스와치 hex] — slug matches garment_colors.color_family
const COLORS: [string, string, string][] = [
  ["", "전체 색", ""],
  ["white", "화이트", "#FFFFFF"],
  ["black", "블랙", "#1A1A1A"],
  ["gray", "그레이", "#9CA3AF"],
  ["beige", "베이지", "#E8DCC0"],
  ["brown", "브라운", "#5C4033"],
  ["red", "레드", "#DC2626"],
  ["orange", "오렌지", "#F97316"],
  ["yellow", "옐로우", "#EAB308"],
  ["green", "그린", "#16A34A"],
  ["blue", "블루", "#2563EB"],
  ["navy", "네이비", "#1E2A52"],
  ["purple", "퍼플", "#7C3AED"],
  ["pink", "핑크", "#EC4899"],
];

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; season?: string; color?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const sp = await searchParams;
  const cat = sp.cat;
  const season = sp.season;
  const color = sp.color;
  const items = dbConfigured
    ? await api.garments.list({ category: cat, season, color })
    : [];

  // Build a /closet href preserving the other active filters.
  const current: Record<string, string | undefined> = { cat, season, color };
  const hrefWith = (patch: Record<string, string | undefined>) => {
    const next = { ...current, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/closet?${qs}` : "/closet";
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">내 옷장</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {session.user.name ?? "사용자"}님
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/wishlist">위시리스트</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/check">중복확인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/closet/add">옷 추가</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATS.map(([slug, label]) => (
          <Link
            key={slug}
            href={hrefWith({ cat: slug || undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              (cat ?? "") === slug
                ? "border-primary bg-primary/10 font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {SEASONS.map(([slug, label]) => (
          <Link
            key={slug}
            href={hrefWith({ season: slug || undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              (season ?? "") === slug
                ? "border-primary bg-primary/10 font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COLORS.map(([slug, label, hex]) => (
          <Link
            key={slug || "all"}
            href={hrefWith({ color: slug || undefined })}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              (color ?? "") === slug
                ? "border-primary bg-primary/10 font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {hex ? (
              <span
                className="size-3 rounded-full border"
                style={{ backgroundColor: hex }}
              />
            ) : null}
            {label}
          </Link>
        ))}
      </div>

      {!dbConfigured && (
        <p className="mt-6 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          DB가 아직 연결되지 않았어요. <code>.env</code>에 DATABASE_URL을 넣고
          마이그레이션하면 옷이 저장·표시됩니다. (HANDOFF.md 참고)
        </p>
      )}

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-muted-foreground">
            {cat || season || color
              ? "조건에 맞는 옷이 없어요."
              : "아직 등록된 옷이 없어요."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            &lsquo;옷 추가&rsquo;로 첫 옷을 올려보세요.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((g) => (
            <Link
              key={g.id}
              href={`/closet/${g.id}`}
              className="block overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
            >
              {g.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.thumbnailUrl}
                  alt={g.name ?? "옷"}
                  className="aspect-square w-full bg-background object-contain p-2"
                />
              ) : (
                <div className="aspect-square w-full bg-muted" />
              )}
              <div className="p-3">
                <p className="truncate text-sm">{g.name ?? "이름 없음"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
