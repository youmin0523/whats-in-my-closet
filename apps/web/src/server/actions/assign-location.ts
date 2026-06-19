"use server";

import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

export async function assignLocationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const garmentId = Number(formData.get("garmentId"));
  if (!Number.isFinite(garmentId)) return;

  const note = String(formData.get("note") ?? "").trim() || undefined;
  const closetRaw = formData.get("closetId");
  const closetId =
    closetRaw && closetRaw !== "" ? Number(closetRaw) : null;

  if (process.env.DATABASE_URL) {
    try {
      await api.locations.assign({ garmentId, closetId, note });
    } catch {
      // ignore
    }
  }
  redirect(`/closet/${garmentId}`);
}
