"use server";

import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

export type ProductMatch = {
  title: string;
  brand: string | null;
  priceKrw: number | null;
  imageUrl: string | null;
  productUrl: string | null;
  mallName: string | null;
};

export type ScanTagState = {
  status: "idle" | "read" | "error";
  message: string;
  imageUrl?: string;
  brand?: string;
  productName?: string;
  size?: string;
  material?: string;
  matches?: ProductMatch[];
};

/** Step 1: upload the tag photo and read it (Claude vision) for review. */
export async function readTagAction(
  _prev: ScanTagState,
  formData: FormData,
): Promise<ScanTagState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "택 사진을 선택해 주세요." };
  }

  const up = await uploadImage(file);
  let info: {
    brand?: string | null;
    productName?: string | null;
    size?: string | null;
    material?: string | null;
  } = {};
  try {
    info = await api.garments.readTag({ imageUrl: up.url });
  } catch {
    // keep empty → manual entry
  }

  const recognized = !!(
    info.brand ||
    info.productName ||
    info.material ||
    info.size
  );

  // Match the read tag to real catalog products (empty without Naver keys).
  let matches: ProductMatch[] = [];
  try {
    matches = await api.garments.searchProduct({
      brand: info.brand,
      productName: info.productName,
      limit: 3,
    });
  } catch {
    matches = [];
  }

  return {
    status: "read",
    imageUrl: up.url,
    brand: info.brand ?? "",
    productName: info.productName ?? "",
    size: info.size ?? "",
    material: info.material ?? "",
    matches,
    message: recognized
      ? "택을 읽었어요. 확인·수정 후 등록하세요."
      : "자동 인식 결과가 없어요 (ANTHROPIC_API_KEY 미설정 또는 인식 실패). 직접 입력해 등록하세요.",
  };
}

/** Step 2: register the garment from the (reviewed) tag fields. */
export async function createFromTagAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const imageUrl = String(formData.get("imageUrl") ?? "");
  if (!imageUrl) return;

  if (process.env.DATABASE_URL) {
    try {
      await api.garments.create({
        imageUrl,
        name: String(formData.get("productName") ?? "") || undefined,
        brand: String(formData.get("brand") ?? "") || undefined,
        size: String(formData.get("size") ?? "") || undefined,
        material: String(formData.get("material") ?? "") || undefined,
      });
    } catch {
      // fall through to redirect
    }
  }
  redirect("/closet");
}
