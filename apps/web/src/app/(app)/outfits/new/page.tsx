import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { createOutfitAction } from "@/server/actions/outfit";
import { Button } from "@/components/ui/button";

export default async function NewOutfitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const items = dbConfigured ? await api.garments.list() : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <Link
        href="/outfits"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 코디
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">코디 만들기</h1>
      <p className="mt-2 text-muted-foreground">
        옷을 골라 하나의 코디로 저장하세요.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          {dbConfigured
            ? "먼저 옷을 등록하세요."
            : "DB 연결 + 옷 등록 후 코디를 만들 수 있어요."}
        </p>
      ) : (
        <form action={createOutfitAction} className="mt-8 flex flex-col gap-4">
          <input
            name="name"
            placeholder="코디 이름 (예: 비 오는 날 출근룩)"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((g) => (
              <label
                key={g.id}
                className="relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-colors has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary"
              >
                <input
                  type="checkbox"
                  name="garmentIds"
                  value={g.id}
                  className="absolute right-2 top-2 z-10 size-4 accent-primary"
                />
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
              </label>
            ))}
          </div>
          <Button type="submit" size="lg">
            코디 저장
          </Button>
        </form>
      )}
    </div>
  );
}
