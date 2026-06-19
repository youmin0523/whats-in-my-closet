"use server";

import { api } from "@/server/api";
import { auth } from "@/server/auth";

export type StylistState = {
  status: "idle" | "ok" | "error";
  answer?: string;
  items?: { id: number; name: string | null; thumbnailUrl: string | null }[];
  message?: string;
};

export async function askStylistAction(
  _prev: StylistState,
  formData: FormData,
): Promise<StylistState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "로그인이 필요합니다." };

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { status: "error", message: "질문을 입력해 주세요." };

  if (!process.env.DATABASE_URL) {
    return {
      status: "ok",
      answer: "DB 연결 후 내 옷으로 답변해드려요. (지금은 데모)",
      items: [],
    };
  }

  try {
    const res = await api.recommendations.ask({ question });
    return { status: "ok", answer: res.answer, items: res.items };
  } catch {
    return { status: "error", message: "답변 중 오류가 발생했어요." };
  }
}
