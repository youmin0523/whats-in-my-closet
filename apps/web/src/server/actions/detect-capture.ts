"use server";

import sharp from "sharp";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

type Color = { hex: string; population?: number };
export type Draft = {
  imageUrl: string;
  colors: Color[];
  category?: string | null;
};
export type DetectState = {
  status: "idle" | "ok" | "error";
  message?: string;
  drafts?: Draft[];
};

/** Detect garments in one photo → crop each → upload crops → return review drafts. */
export async function detectCaptureAction(
  _prev: DetectState,
  formData: FormData,
): Promise<DetectState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { status: "error", message: "사진을 선택해 주세요." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const source = await uploadImage(file);

  let dets: {
    bbox: { x: number; y: number; w: number; h: number };
    category?: string | null;
  }[] = [];
  try {
    dets = await api.capture.detect({ imageUrl: source.url });
  } catch {
    dets = [];
  }

  const meta = await sharp(buffer).metadata().catch(() => null);
  const W = meta?.width ?? 0;
  const H = meta?.height ?? 0;

  const drafts: Draft[] = [];
  let i = 0;
  for (const d of dets) {
    i += 1;
    const b = d.bbox;
    const isCrop =
      W > 0 &&
      H > 0 &&
      (b.w < 0.98 || b.h < 0.98) &&
      b.w > 0.02 &&
      b.h > 0.02;
    if (isCrop) {
      try {
        const left = Math.max(0, Math.round(b.x * W));
        const top = Math.max(0, Math.round(b.y * H));
        const width = Math.max(1, Math.min(W - left, Math.round(b.w * W)));
        const height = Math.max(1, Math.min(H - top, Math.round(b.h * H)));
        const cropBuf = await sharp(buffer)
          .extract({ left, top, width, height })
          .toBuffer();
        const cropFile = new File(
          [new Uint8Array(cropBuf)],
          `crop-${Date.now()}-${i}.jpg`,
          { type: "image/jpeg" },
        );
        const up = await uploadImage(cropFile);
        drafts.push({
          imageUrl: up.url,
          colors: up.colors,
          category: d.category ?? null,
        });
        continue;
      } catch {
        // fall through to whole image
      }
    }
    drafts.push({
      imageUrl: source.url,
      colors: source.colors,
      category: d.category ?? null,
    });
  }
  if (drafts.length === 0)
    drafts.push({ imageUrl: source.url, colors: source.colors, category: null });

  return { status: "ok", drafts };
}

export async function commitDetectedAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  let items: Draft[] = [];
  try {
    items = JSON.parse(String(formData.get("drafts") ?? "[]")) as Draft[];
  } catch {
    items = [];
  }

  if (items.length && process.env.DATABASE_URL) {
    try {
      await api.capture.commit({
        items: items.map((it, idx) => ({
          imageUrl: it.imageUrl,
          name: String(formData.get(`name-${idx}`) ?? "").trim() || null,
          category: it.category ?? null,
          colors: it.colors,
        })),
      });
    } catch {
      // ignore
    }
  }
  redirect("/closet");
}
