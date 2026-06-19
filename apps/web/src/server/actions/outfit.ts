"use server";

import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

export async function saveOutfitAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const ids = String(formData.get("garmentIds") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (ids.length && process.env.DATABASE_URL) {
    try {
      await api.outfits.create({ name: "오늘의 코디", garmentIds: ids });
    } catch {
      // ignore
    }
  }
  redirect("/outfits");
}

/** Manual outfit builder — pick garments and save as a coordination. */
export async function createOutfitAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const ids = formData
    .getAll("garmentIds")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const name = String(formData.get("name") ?? "").trim() || "내 코디";
  if (ids.length && process.env.DATABASE_URL) {
    try {
      await api.outfits.create({ name, garmentIds: ids });
    } catch {
      // ignore
    }
  }
  redirect("/outfits");
}
