import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { cancelAction, subscribeAction } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const plans = await api.billing.plans();
  const current = dbConfigured
    ? await api.billing.current().catch(() => null)
    : null;
  const currentSlug = current?.plan.slug ?? "free";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <div className="border-b pb-6">
        <p className="text-sm text-muted-foreground">설정</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">요금제</h1>
      </div>

      {!dbConfigured && (
        <p className="mt-6 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          DB를 연결하면 현재 플랜과 사용량이 보이고 구독도 바꿀 수 있어요. 결제는
          PortOne/Toss 키를 넣으면 켜져요.
        </p>
      )}

      {current && (
        <div className="mt-8 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">현재 플랜</p>
              <p className="text-xl font-semibold tracking-tight">
                {current.plan.nameKo}
                {current.status === "pending" && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (결제 대기중)
                  </span>
                )}
              </p>
            </div>
            {currentSlug !== "free" && (
              <form action={cancelAction}>
                <Button variant="ghost" size="sm">
                  무료로 변경
                </Button>
              </form>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">보유 옷</span>
                <span className="tabular-nums">
                  {current.itemCount}
                  {current.items.unlimited ? " (무제한)" : ` / ${current.items.max}`}
                </span>
              </div>
              {!current.items.unlimited && current.items.max != null && (
                <UsageBar used={current.itemCount} total={current.items.max} />
              )}
            </div>
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">이번 달 가상 피팅</span>
                <span className="tabular-nums">
                  {current.tryonUsed} / {current.tryon.limit}
                </span>
              </div>
              <UsageBar used={current.tryonUsed} total={current.tryon.limit} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = dbConfigured && p.slug === currentSlug;
          return (
            <div
              key={p.slug}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-5",
                isCurrent && "border-primary ring-1 ring-primary",
              )}
            >
              <p className="font-medium">{p.nameKo}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {p.priceKrw === 0 ? (
                  "무료"
                ) : (
                  <>
                    {won(p.priceKrw)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / 월
                    </span>
                  </>
                )}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {(p.features ?? []).map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    현재 플랜
                  </Button>
                ) : (
                  <form action={subscribeAction}>
                    <input type="hidden" name="plan" value={p.slug} />
                    <Button
                      type="submit"
                      variant={p.slug === "free" ? "ghost" : "default"}
                      className="w-full"
                      disabled={!dbConfigured}
                    >
                      {p.slug === "free" ? "무료로 변경" : "선택"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        결제 키(PortOne/Toss)를 연결하기 전에는 ‘선택’하면 바로 적용돼요(데모).
        연결한 뒤에는 결제 페이지로 넘어가요.
      </p>
    </div>
  );
}
