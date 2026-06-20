import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { UseMyLocation } from "@/components/use-my-location";
import { StylistChat } from "@/components/stylist-chat";
import { Button } from "@/components/ui/button";
import { saveOutfitAction } from "@/server/actions/outfit";

export const metadata = { title: "오늘 코디" };

const CAT_KO: Record<string, string> = {
  tops: "상의",
  bottoms: "하의",
  outerwear: "아우터",
  dresses: "원피스",
  shoes: "신발",
  socks: "양말",
  bags: "가방",
  accessories: "액세서리",
  headwear: "모자",
  underwear: "이너웨어",
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const lat = Number(sp.lat ?? 37.5665); // Seoul default
  const lng = Number(sp.lng ?? 126.978);
  const dbConfigured = !!process.env.DATABASE_URL;

  // Nothing blocks the first paint — the page shell renders instantly and both
  // the weather card and the LLM outfit stream in under their own Suspense.
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">오늘의 추천</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            뭐 입지?
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UseMyLocation />
          <Link
            href="/closet"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            옷장 →
          </Link>
        </div>
      </div>

      <Suspense fallback={<WeatherSkeleton />}>
        <TodayWeather lat={lat} lng={lng} />
      </Suspense>

      <Suspense fallback={<OutfitSkeleton />}>
        <TodayOutfit lat={lat} lng={lng} dbConfigured={dbConfigured} />
      </Suspense>

      <div className="mt-8">
        <StylistChat />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/outfits" className="text-primary hover:opacity-80">
          저장한 코디 →
        </Link>
        <Link href="/personal-color" className="text-primary hover:opacity-80">
          퍼스널컬러 진단 →
        </Link>
        <Link href="/tryon" className="text-primary hover:opacity-80">
          가상 피팅 →
        </Link>
      </div>
    </div>
  );
}

/** Streamed weather card (KMA ~2s on a cold cache; cached ~30min after). */
async function TodayWeather({ lat, lng }: { lat: number; lng: number }) {
  const w = await api.weather.forecast({ lat, lng });
  const chips = [
    w.constraints.outerWeight === "heavy" && "두꺼운 아우터",
    w.constraints.outerWeight === "light" && "가벼운 아우터",
    w.constraints.outerWeight === "none" && "아우터 불필요",
    w.constraints.requireRemovableLayer && "탈착 레이어",
    w.constraints.preferWaterResistant && "방수·어두운 색",
  ].filter(Boolean) as string[];

  return (
    <div className="mt-8 rounded-xl border bg-card p-6">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {Math.round(w.forecast.tempMax)}°
        </span>
        <span className="text-muted-foreground tabular-nums">
          / {Math.round(w.forecast.tempMin)}°
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {w.source === "kma" ? "기상청" : "예시 데이터"}
        </span>
      </div>
      <p className="mt-3 text-muted-foreground">{w.summary}</p>
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border bg-secondary/50 px-3 py-1 text-xs"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="mt-8 rounded-xl border bg-card p-6" aria-busy="true">
      <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

/** Streamed separately — the LLM outfit call is the slow part of the page. */
async function TodayOutfit({
  lat,
  lng,
  dbConfigured,
}: {
  lat: number;
  lng: number;
  dbConfigured: boolean;
}) {
  const reco = dbConfigured
    ? await api.recommendations.today({ lat, lng }).catch(() => null)
    : null;

  if (!reco || reco.outfit.length === 0) {
    return (
      <p className="mt-6 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
        {dbConfigured
          ? "옷을 등록하면 오늘 날씨에 맞는 코디를 추천해드려요."
          : "DB 연결하고 옷을 등록하면, 가진 옷으로 오늘 코디를 추천해드려요."}
      </p>
    );
  }

  return (
    <div className="mt-8">
      {reco.rationale && (
        <p className="mb-3 text-sm text-muted-foreground">{reco.rationale}</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {reco.outfit.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-lg border bg-card">
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
            <div className="p-2">
              {g.categorySlug && CAT_KO[g.categorySlug] && (
                <span className="text-[10px] font-medium text-primary">
                  {CAT_KO[g.categorySlug]}
                </span>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {g.name ?? "옷"}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form action={saveOutfitAction} className="mt-4">
        <input
          type="hidden"
          name="garmentIds"
          value={reco.outfit.map((g) => g.id).join(",")}
        />
        <Button type="submit" variant="outline" size="sm">
          이 코디 저장
        </Button>
      </form>
    </div>
  );
}

function OutfitSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-square w-full animate-pulse bg-muted" />
            <div className="p-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">오늘 코디를 고르는 중…</span>
    </div>
  );
}
