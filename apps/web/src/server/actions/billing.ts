"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

type PlanSlug = "free" | "premium" | "premium_plus";
const isPlan = (s: string): s is PlanSlug =>
  s === "free" || s === "premium" || s === "premium_plus";

/** Subscribe/upgrade. Dev activates immediately; real PG redirects to checkout. */
export async function subscribeAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;
  const plan = String(formData.get("plan") ?? "");
  if (!isPlan(plan)) return;

  const res = await api.billing.subscribe({ planSlug: plan });
  revalidatePath("/settings");
  if (res.mode === "checkout" && res.checkoutUrl) {
    redirect(res.checkoutUrl); // throws NEXT_REDIRECT — must stay outside try/catch
  }
}

export async function cancelAction(): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;
  await api.billing.cancel();
  revalidatePath("/settings");
}
