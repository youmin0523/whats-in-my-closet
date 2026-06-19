import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ScanTagForm } from "@/components/scan-tag-form";

export default async function ScanTagPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/closet/add"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 옷 추가
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        택 찍어서 등록
      </h1>
      <p className="mt-2 text-muted-foreground">
        상품 택이나 라벨을 찍어 올리면 브랜드, 상품명, 사이즈, 소재를 읽어
        채워드려요. 확인만 하고 등록하면 끝이에요.
      </p>
      <div className="mt-8">
        <ScanTagForm />
      </div>
    </div>
  );
}
