"use server";

import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

export type TryOnState = {
  status: "idle" | "ok" | "error";
  message: string;
  resultUrl?: string;
};

/** Upload a base photo + a garment photo → render a try-on preview (FASHN, or
 *  echo-base-photo fallback without a key). No DB needed. */
export async function tryOnAction(
  _prev: TryOnState,
  formData: FormData,
): Promise<TryOnState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const base = formData.get("base");
  const garment = formData.get("garment");
  if (!(base instanceof File) || base.size === 0)
    return { status: "error", message: "내 사진을 올려주세요." };
  if (!(garment instanceof File) || garment.size === 0)
    return { status: "error", message: "입혀볼 옷 사진을 올려주세요." };

  const baseUp = await uploadImage(base);
  const garUp = await uploadImage(garment);

  try {
    const res = await api.tryon.preview({
      basePhotoUrl: baseUp.url,
      garmentImageUrl: garUp.url,
    });
    return {
      status: "ok",
      resultUrl: res.resultUrl ?? baseUp.url,
      message: res.resultUrl
        ? "완성! (FASHN 키가 없으면 미리보기는 원본 사진으로 표시됩니다.)"
        : "처리 중이에요. 잠시 후 다시 시도해 주세요.",
    };
  } catch {
    return { status: "error", message: "피팅 중 오류가 발생했어요." };
  }
}
