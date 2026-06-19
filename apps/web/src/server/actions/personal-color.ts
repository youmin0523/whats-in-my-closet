"use server";

import { api } from "@/server/api";
import { auth } from "@/server/auth";

export type SavePcState = {
  status: "idle" | "saved" | "nodb" | "error";
  message: string;
};

export async function savePersonalColorAction(
  _prev: SavePcState,
  formData: FormData,
): Promise<SavePcState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const undertone = String(formData.get("undertone") ?? "");
  const value = String(formData.get("value") ?? "");
  const chroma = String(formData.get("chroma") ?? "");
  if (
    !["warm", "cool"].includes(undertone) ||
    !["light", "deep"].includes(value) ||
    !["bright", "muted"].includes(chroma)
  ) {
    return { status: "error", message: "퀴즈를 완료해 주세요." };
  }

  if (!process.env.DATABASE_URL) {
    return { status: "nodb", message: "진단 완료 — DB 연결 후 저장됩니다." };
  }

  try {
    await api.personalColor.submitQuiz({
      undertone: undertone as "warm" | "cool",
      value: value as "light" | "deep",
      chroma: chroma as "bright" | "muted",
    });
    return { status: "saved", message: "퍼스널컬러를 저장했어요. 추천에 반영됩니다." };
  } catch {
    return { status: "error", message: "저장 중 오류가 발생했어요." };
  }
}
