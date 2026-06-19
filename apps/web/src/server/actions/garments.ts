"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

const STATUSES = ["active", "archived", "donated", "wishlist"] as const;
type Status = (typeof STATUSES)[number];

/** Inline-edit a garment's basics (name, category·subcategory, season, status). */
export async function updateGarmentAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  const name = String(formData.get("name") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "active");
  const status: Status = (STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as Status)
    : "active";

  try {
    await api.garments.update({
      id,
      name: name || null,
      categoryId: Number(formData.get("categoryId")) || null,
      subcategoryId: Number(formData.get("subcategoryId")) || null,
      season: formData.getAll("season").map(String).filter(Boolean),
      status,
    });
  } catch {
    // ignore — revalidate either way
  }
  revalidatePath(`/closet/${id}`);
  revalidatePath("/closet");
}

export type AddGarmentState = {
  status: "idle" | "ok" | "error";
  message: string;
  imageUrl?: string;
  persisted?: boolean;
};

/** Upload an image and (when a DB is configured) persist it as a garment. */
export async function addGarmentAction(
  _prev: AddGarmentState,
  formData: FormData,
): Promise<AddGarmentState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "이미지를 선택해 주세요." };
  }

  const uploaded = await uploadImage(file);
  const name = String(formData.get("name") ?? "").trim() || undefined;
  const wishlist = formData.get("wishlist") === "on";
  const categoryId = Number(formData.get("categoryId")) || undefined;
  const subcategoryId = Number(formData.get("subcategoryId")) || undefined;
  const seasonArr = formData.getAll("season").map(String).filter(Boolean);

  if (!process.env.DATABASE_URL) {
    return {
      status: "ok",
      persisted: false,
      imageUrl: uploaded.url,
      message:
        "업로드 완료 — DB 미연결이라 아직 저장되진 않았어요. (.env에 DATABASE_URL 추가 후 마이그레이션)",
    };
  }

  try {
    await api.garments.create({
      imageUrl: uploaded.url,
      bgRemovedUrl: uploaded.bgRemovedUrl,
      cloudinaryPublicId: uploaded.publicId,
      name,
      colors: uploaded.colors,
      categoryId,
      subcategoryId,
      season: seasonArr.length ? seasonArr : undefined,
      status: wishlist ? "wishlist" : undefined,
    });
    return {
      status: "ok",
      persisted: true,
      imageUrl: uploaded.url,
      message: wishlist ? "위시리스트에 담았어요." : "옷장에 추가했어요.",
    };
  } catch {
    return {
      status: "error",
      imageUrl: uploaded.url,
      message: "저장 중 오류가 발생했어요.",
    };
  }
}
