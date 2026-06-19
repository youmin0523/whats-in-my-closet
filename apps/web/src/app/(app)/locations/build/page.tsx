import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ClosetBuilder } from "@/components/closet-builder";

export default async function BuildClosetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">옷장 만들기</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            입면으로 옷장 짜기
          </h1>
        </div>
        <Link
          href="/locations"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 위치
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        실제 옷장을 앞에서 본 면(입면)으로 만들면 — 2D 배치도는 그대로, 3D
        시뮬레이션은 자동으로 입체로 그려져요. 프리셋으로 시작해 칸을 더하세요.
      </p>

      <div className="mt-6">
        <ClosetBuilder />
      </div>
    </div>
  );
}
