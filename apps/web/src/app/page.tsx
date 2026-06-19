import Link from "next/link";
import { Button } from "@/components/ui/button";

/* Garment tiles — the visual language (color = the clothes), reused as the
   "browse your closet like a shop" motif. */
const TILES: { c: string; k: string; dup?: boolean }[] = [
  { c: "#2f3b54", k: "셔츠" },
  { c: "#9c5b43", k: "니트" },
  { c: "#5e6a4c", k: "맨투맨" },
  { c: "#c8b89a", k: "코트" },
  { c: "#34527a", k: "청바지", dup: true },
  { c: "#b08968", k: "치노" },
  { c: "#2b2b2b", k: "후드" },
  { c: "#8a9a7b", k: "가디건" },
  { c: "#a5503a", k: "스니커즈" },
];

const CHIPS = ["전체", "상의", "하의", "아우터", "신발", "가방"];

const STEPS = [
  { n: "01", t: "사진으로 올리기", d: "옷을 찍거나 여러 장 한 번에. AI가 알아서 인식해요." },
  { n: "02", t: "AI가 자동 분류", d: "카테고리·색상·계절까지 자동 태깅. 정리는 AI 몫." },
  { n: "03", t: "사기 전 중복 경고", d: "비슷한 옷이 이미 있으면 0–100 점수로 알려줘요." },
  { n: "04", t: "위치·코디까지", d: "어디 뒀는지 찾고, 오늘 날씨에 맞는 코디 추천." },
];

const FEATURES = [
  {
    tag: "중복 감지",
    t: "비슷한 옷, 또 사기 전에",
    d: "이미 가진 옷과 색·디자인이 얼마나 닮았는지 AI가 점수로 알려줍니다. 매장에서, 사기 전에.",
  },
  {
    tag: "위치 추적",
    t: "어디 뒀는지 바로",
    d: "‘네이비 니트 = 안방 옷장 2번 서랍’. 옷의 물리적 위치를 기억하고 2D·3D로 찾아줍니다.",
  },
  {
    tag: "실시간 인벤토리",
    t: "지금 내 옷장, 한눈에",
    d: "상의 24 · 하의 18 · 양말 12켤레. 카테고리·색상별 수량을 실시간으로 들여다봅니다.",
  },
];

function Tile({ c, k, dup }: { c: string; k: string; dup?: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-transform duration-300 hover:-translate-y-1">
      <div className="aspect-[3/4] w-full" style={{ backgroundColor: c }} />
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="text-xs text-muted-foreground">{k}</span>
        <span
          className="size-2.5 rounded-full border"
          style={{ backgroundColor: c }}
        />
      </div>
      {dup && (
        <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground shadow-sm">
          비슷한 옷 87
        </span>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* sticky nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 md:px-10">
          <div className="flex items-baseline gap-2.5">
            <span className="text-base font-semibold tracking-tight">
              What&rsquo;s in my closet
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              옷장 지킴이
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">시작하기</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="border-b">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
            <div className="duration-700 animate-in fade-in slide-in-from-bottom-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                AI 옷장 관리 플랫폼
              </span>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                가진 옷을 알면,
                <br />
                충동구매가 멈춥니다.
              </h1>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                옷을 사진으로 올리면 AI가 카테고리·색상·계절을 자동 분류해요.
                비슷한 옷이 있으면 <b className="font-medium text-foreground">사기
                전에 경고</b>하고, 어디 뒀는지 찾고, 오늘 뭘 입을지까지.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/login">내 옷장 만들기</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">둘러보기 →</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                사진만 올리면 끝 · 카카오·네이버·구글 로그인
              </p>
            </div>

            {/* closet "shop" mockup */}
            <div className="duration-700 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between px-1 pb-3">
                  <p className="text-sm font-medium">내 옷장</p>
                  <span className="text-xs text-muted-foreground">51벌</span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-1 pb-3">
                  {CHIPS.map((ch, i) => (
                    <span
                      key={ch}
                      className={
                        i === 0
                          ? "rounded-full border border-primary bg-primary/10 px-2.5 py-0.5 text-xs font-medium"
                          : "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {TILES.map((t) => (
                    <Tile key={t.k} {...t} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SHOP-YOUR-CLOSET concept */}
        <section className="border-b bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">쇼핑하듯</p>
              <h2 className="mt-2 text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
                내 옷장을 매장처럼 둘러봐요
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                배경 제거된 옷을 갤러리처럼 진열하고, 카테고리·색상·계절로 필터링.
                쇼핑몰에서 옷 고르듯, 이미 가진 옷을 한눈에 보고 고릅니다.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[...TILES, ...TILES.slice(0, 3)].map((t, i) => (
                <Tile key={`${t.k}-${i}`} c={t.c} k={t.k} />
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              사진 한 장이면 충분해요
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <span className="text-sm font-medium text-primary tabular-nums">
                    {s.n}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">
                    {s.t}
                  </h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES (차별화) */}
        <section className="border-b bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
            <div className="grid gap-5 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.tag}
                  className="group rounded-xl border bg-card p-6 transition-colors hover:border-foreground/30"
                >
                  <span className="inline-block rounded-full border bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {f.tag}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">
                    {f.t}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {f.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-20 text-center md:px-10 md:py-28">
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              지금, 내 옷장을 들여다보세요
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
              충동구매는 줄이고, 가진 옷은 더 잘 입고. 옷장 지킴이가 챙겨드려요.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/login">무료로 시작하기</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            What&rsquo;s in my closet — 옷장 지킴이
          </p>
          <p className="text-xs text-muted-foreground">
            Next.js · tRPC · pgvector · OpenAI
          </p>
        </div>
      </footer>
    </div>
  );
}
