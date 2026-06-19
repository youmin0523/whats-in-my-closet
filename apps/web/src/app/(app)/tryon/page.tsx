import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { TryOnForm } from "@/components/tryon-form";

export const metadata = { title: "가상 피팅" };

export default async function TryOnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/closet"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 옷장
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">가상 피팅</h1>
      <p className="mt-2 text-muted-foreground">
        내 사진과 옷을 올리면 입은 모습을 미리 볼 수 있어요.
      </p>
      <div className="mt-8">
        <TryOnForm />
      </div>
    </div>
  );
}
