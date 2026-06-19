import Link from "next/link";
import { Button } from "@/components/ui/button";

const principles = [
  {
    no: "01",
    title: "비슷한 옷, 또 사기 전에",
    body: "이미 가진 옷과 색·디자인이 얼마나 닮았는지 알려줍니다. 옷장 앞에서가 아니라 매장에서, 사기 전에.",
  },
  {
    no: "02",
    title: "어디 뒀는지 바로",
    body: "네이비 니트는 안방 옷장 두 번째 서랍. 옷의 물리적 위치를 기억하고 찾아 줍니다.",
  },
  {
    no: "03",
    title: "지금 내 옷장, 한눈에",
    body: "상의 24 · 하의 18 · 양말 12켤레. 카테고리별 수량을 실시간으로 들여다봅니다.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-5 md:px-10">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-semibold tracking-tight">
            What&rsquo;s in my closet
          </span>
          <span className="text-xs text-muted-foreground">옷장 지킴이</span>
        </div>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">시작하기</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-12 md:px-10 md:py-28">
          <div className="md:col-span-7">
            <p className="mb-5 text-sm font-medium text-primary">
              내 옷장을 들여다보는 가장 똑똑한 방법
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              가진 옷을 알면,
              <br />
              충동구매가 멈춥니다.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              비스포크 냉장고가 안을 보여주듯, 옷장 안을 실시간으로. 비슷한 옷의
              중복 구매를 막고, 어디 뒀는지 찾고, 오늘 뭘 입을지까지.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">내 옷장 만들기</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">어떻게 동작하나요</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-5 md:pt-10">
            <div className="rounded-xl border bg-card p-8">
              <p className="text-sm text-muted-foreground">오늘의 옷장</p>
              <dl className="mt-5 space-y-4">
                {[
                  ["상의", "24"],
                  ["하의", "18"],
                  ["아우터", "9"],
                  ["양말", "12켤레"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10">
            <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
              {principles.map((p) => (
                <div key={p.no}>
                  <span className="text-sm font-medium text-primary tabular-nums">
                    {p.no}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">
                    {p.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8 md:px-10">
        <p className="text-sm text-muted-foreground">
          What&rsquo;s in my closet — 옷장 지킴이
        </p>
      </footer>
    </div>
  );
}
