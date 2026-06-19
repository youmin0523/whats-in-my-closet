"use server";

import { api } from "@/server/api";
import { auth } from "@/server/auth";
import { uploadImage } from "@/server/upload";

export type CheckMatch = {
  garmentId: number;
  name: string | null;
  thumbnailUrl: string | null;
  score: number;
  verdict: string;
};

export type CheckState = {
  status: "idle" | "ok" | "error";
  message: string;
  imageUrl?: string;
  verdict?: "strong" | "soft" | "none";
  topScore?: number;
  matches?: CheckMatch[];
};

/** "사기 전에 확인" — score a candidate photo against the user's closet. */
export async function checkDuplicateAction(
  _prev: CheckState,
  formData: FormData,
): Promise<CheckState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "이미지를 선택해 주세요." };
  }

  const uploaded = await uploadImage(file);

  if (!process.env.DATABASE_URL) {
    return {
      status: "ok",
      imageUrl: uploaded.url,
      verdict: "none",
      topScore: 0,
      matches: [],
      message: "업로드 완료 — DB 연결 후 옷장과 대조해 중복을 찾습니다.",
    };
  }

  try {
    const res = await api.similarity.checkDuplicate({
      imageUrl: uploaded.url,
      candidateColors: uploaded.colors.map((c) => c.hex),
    });
    // Inform with a count, never prescribe — the decision to add is the user's.
    // (기본템·같은 디자인 다벌 구매처럼 의도된 중복도 있으니 훈수가 아닌 정보로.)
    const owned = res.matches.filter((m) => m.verdict !== "none").length;
    const message =
      res.verdict === "strong"
        ? `거의 똑같은 옷, 벌써 ${owned}벌 있어요.`
        : res.verdict === "soft"
          ? `비슷한 옷이 ${owned}벌 있어요.`
          : "이런 옷은 처음이네요.";
    return {
      status: "ok",
      imageUrl: uploaded.url,
      verdict: res.verdict,
      topScore: res.topScore,
      matches: res.matches.slice(0, 6),
      message,
    };
  } catch {
    return {
      status: "error",
      imageUrl: uploaded.url,
      message: "조회 중 오류가 발생했어요.",
    };
  }
}
