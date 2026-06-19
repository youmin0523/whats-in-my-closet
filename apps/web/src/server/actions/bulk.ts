"use server";

import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

export type BulkState = {
  status: "idle" | "ok" | "error";
  message: string;
  previews: string[];
  persisted: number;
};

/** Add many garments at once (the "여러 벌 한번에" onboarding for an existing wardrobe). */
export async function bulkAddAction(
  _prev: BulkState,
  formData: FormData,
): Promise<BulkState> {
  const session = await auth();
  if (!session?.user)
    return {
      status: "error",
      message: "로그인이 필요합니다.",
      previews: [],
      persisted: 0,
    };

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0)
    return {
      status: "error",
      message: "사진을 한 장 이상 선택해 주세요.",
      previews: [],
      persisted: 0,
    };

  const dbConfigured = !!process.env.DATABASE_URL;
  const previews: string[] = [];
  let persisted = 0;

  type Color = { hex: string; population?: number };
  const uploads: { url: string; colors: Color[] }[] = [];
  for (const file of files.slice(0, 30)) {
    const up = await uploadImage(file);
    previews.push(up.url);
    uploads.push({ url: up.url, colors: up.colors });
  }

  // Route through the auto-tag pipeline so bulk-added items get a real
  // category/subcategory/season (resolved onto the taxonomy), not just an image.
  if (dbConfigured && uploads.length) {
    try {
      const session = await api.capture.startBulk({
        images: uploads.map((u) => ({ imageUrl: u.url, colors: u.colors })),
      });
      const drafts = (session?.draft ?? []) as {
        imageUrl: string;
        name: string | null;
        categoryId: number | null;
        subcategoryId: number | null;
        season: string[];
        colors: Color[];
      }[];
      const res = await api.capture.commit({
        sessionId: session?.id,
        items: drafts.map((d) => ({
          imageUrl: d.imageUrl,
          name: d.name,
          categoryId: d.categoryId,
          subcategoryId: d.subcategoryId,
          season: d.season,
          colors: d.colors,
        })),
      });
      persisted = res.created;
    } catch {
      // leave persisted at 0 — previews still returned
    }
  }

  return {
    status: "ok",
    previews,
    persisted,
    message: dbConfigured
      ? `${persisted}벌을 옷장에 추가했어요.`
      : `${previews.length}장 업로드 완료 — DB 연결 후 자동 저장됩니다.`,
  };
}
