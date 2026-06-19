"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console / monitoring; digest correlates with server logs.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">문제가 생겼어요</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        잠시 후 다시 시도해 주세요
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        일시적인 오류일 수 있어요. 다시 시도하거나 옷장으로 돌아가세요.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          오류 코드: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <Button onClick={() => reset()}>다시 시도</Button>
        <Button asChild variant="outline">
          <Link href="/closet">옷장으로</Link>
        </Button>
      </div>
    </div>
  );
}
