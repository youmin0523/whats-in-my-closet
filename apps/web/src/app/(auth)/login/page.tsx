import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, devLoginEnabled, signIn } from "@/server/auth";
import { Button } from "@/components/ui/button";

const SOCIAL = [
  { id: "kakao", label: "카카오로 계속하기", env: "AUTH_KAKAO_ID" },
  { id: "naver", label: "네이버로 계속하기", env: "AUTH_NAVER_ID" },
  { id: "google", label: "Google로 계속하기", env: "AUTH_GOOGLE_ID" },
] as const;

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/closet");

  const social = SOCIAL.map((s) => ({ ...s, on: !!process.env[s.env] }));
  const anySocial = social.some((s) => s.on);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-10 text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground"
      >
        What&rsquo;s in my closet
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        옷장 지킴이 시작하기
      </h1>
      <p className="mt-2 text-muted-foreground">
        내 옷장, 사진 한 장으로 정리하기.
      </p>

      <div className="mt-9 flex flex-col gap-3">
        {social
          .filter((s) => s.on)
          .map((s) => (
            <form
              key={s.id}
              action={async () => {
                "use server";
                await signIn(s.id, { redirectTo: "/closet" });
              }}
            >
              <Button type="submit" size="lg" className="w-full">
                {s.label}
              </Button>
            </form>
          ))}

        {!anySocial && (
          <p className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
            소셜 로그인 키가 아직 없어요. 아래 <b>개발 로그인</b>으로 바로
            둘러보세요. (카카오·네이버·구글 키는 <code>.env</code>에 넣으면
            돼요)
          </p>
        )}

        {devLoginEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev", {
                redirectTo: "/closet",
                name: String(formData.get("name") ?? ""),
              });
            }}
            className="mt-1 flex flex-col gap-2"
          >
            <input
              name="name"
              placeholder="이름 (선택)"
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <Button
              type="submit"
              variant={anySocial ? "outline" : "default"}
              size="lg"
              className="w-full"
            >
              개발 로그인으로 둘러보기
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
