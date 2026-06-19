import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { CheckForm } from "@/components/check-form";

export default async function CheckPage() {
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
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        사기 전에 확인
      </h1>
      <p className="mt-2 text-muted-foreground">
        사려는 옷을 찍어 올리면, 내 옷장에 비슷한 옷이 있는지 알려드려요.
      </p>
      <div className="mt-8">
        <CheckForm />
      </div>
    </div>
  );
}
