import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { AddGarmentForm } from "@/components/add-garment-form";
import { RegisterModeTabs } from "@/components/register-mode-tabs";

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
      <div className="mt-6">
        <RegisterModeTabs />
      </div>
      <div className="mt-6">
        <AddGarmentForm taxonomy={taxonomy} />
      </div>
    </div>
  );
}
