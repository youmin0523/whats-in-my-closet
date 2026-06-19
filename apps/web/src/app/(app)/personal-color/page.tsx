import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { PersonalColorQuiz } from "@/components/personal-color-quiz";

export default async function PersonalColorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/today"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 오늘의 추천
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        퍼스널컬러 진단
      </h1>
      <p className="mt-2 text-muted-foreground">
        세 가지만 고르면 나의 퍼스널컬러와 어울리는 팔레트를 알려드려요. 코디
        추천에도 반영됩니다.
      </p>
      <div className="mt-8">
        <PersonalColorQuiz />
      </div>
    </div>
  );
}
