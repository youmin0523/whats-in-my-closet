import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        없는 페이지예요
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        주소가 바뀌었거나 사라진 페이지일 수 있어요.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/closet">내 옷장</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    </div>
  );
}
