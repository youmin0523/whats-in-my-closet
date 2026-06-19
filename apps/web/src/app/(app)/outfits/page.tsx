import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { Button } from "@/components/ui/button";

export default async function OutfitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const outfits = dbConfigured ? await api.outfits.list() : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">저장한 코디</p>
          <h1 className="text-2xl font-semibold tracking-tight">코디</h1>
        </div>
        <Button asChild size="sm">
          <Link href="/outfits/new">코디 만들기</Link>
        </Button>
      </div>

      {outfits.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-muted-foreground">저장한 코디가 없어요.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href="/today" className="text-primary hover:opacity-80">
              오늘 추천
            </Link>
            에서 마음에 드는 코디를 저장하세요.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {outfits.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <span className="text-sm font-medium">{o.name ?? "코디"}</span>
              <span className="text-xs text-muted-foreground">
                {o.occasion ?? (o.source === "ai_reco" ? "AI 추천" : "직접")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
