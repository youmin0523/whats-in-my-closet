import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { AddGarmentForm } from "@/components/add-garment-form";

export default async function AddGarmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const taxonomy = process.env.DATABASE_URL
    ? await api.system.taxonomy().catch(() => [])
    : [];

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/closet"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 옷장
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">옷 추가</h1>
      <p className="mt-2 text-muted-foreground">
        옷 사진을 올리면 옷장에 추가돼요.
      </p>
      <div className="mt-8">
        <AddGarmentForm taxonomy={taxonomy} />
      </div>
      <div className="mt-6 flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          상품 택이 있다면{" "}
          <Link href="/closet/scan-tag" className="text-primary hover:opacity-80">
            택 찍어서 등록
          </Link>
        </p>
        <p>
          기존 옷이 많다면{" "}
          <Link href="/closet/capture" className="text-primary hover:opacity-80">
            여러 벌 한번에 등록
          </Link>
        </p>
      </div>
    </div>
  );
}
