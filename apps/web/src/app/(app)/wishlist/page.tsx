import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { Button } from "@/components/ui/button";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbConfigured = !!process.env.DATABASE_URL;
  const items = dbConfigured
    ? await api.garments.list({ status: "wishlist" })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">살까 말까</p>
          <h1 className="text-2xl font-semibold tracking-tight">위시리스트</h1>
        </div>
        <Button asChild size="sm">
          <Link href="/check">사기 전 중복확인</Link>
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        사기 전에{" "}
        <Link href="/check" className="text-primary hover:opacity-80">
          중복확인
        </Link>
        으로 비슷한 옷이 이미 있는지 확인하세요.
      </p>

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-muted-foreground">위시리스트가 비어 있어요.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            옷 추가에서 &lsquo;살까 말까&rsquo;로 담아두세요.
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
