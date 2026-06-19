import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { BulkCaptureForm } from "@/components/bulk-capture-form";
import { DetectCaptureForm } from "@/components/detect-capture-form";

export default async function CapturePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link
        href="/closet"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 옷장
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        여러 벌 한번에 등록
      </h1>
      <p className="mt-2 text-muted-foreground">
        한 장씩 다 찍기 번거롭죠. 여러 장을 한 번에 올리면 배경 제거와 색상,
        태깅까지 알아서 처리해요.
      </p>
      <div className="mt-8">
        <BulkCaptureForm />
      </div>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          한 장에 여러 벌이 같이?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          옷장이나 선반을 한 장 찍으면 옷을 하나씩 찾아 나눠 줘요. (인식 키가
          없으면 한 벌로 처리돼요)
        </p>
        <div className="mt-6">
          <DetectCaptureForm />
        </div>
      </div>
    </div>
  );
}
