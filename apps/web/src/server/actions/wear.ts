"use server";

import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

export async function logWearAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const garmentId = Number(formData.get("garmentId"));
  if (Number.isFinite(garmentId) && process.env.DATABASE_URL) {
    const wornOn = new Date().toISOString().slice(0, 10);
    try {
      await api.outfits.logWear({ garmentId, wornOn });
    } catch {
      // ignore
    }
  }
  if (Number.isFinite(garmentId)) redirect(`/closet/${garmentId}`);
}

export async function setPriceAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const garmentId = Number(formData.get("garmentId"));
  const digits = String(formData.get("price") ?? "").replace(/[^0-9]/g, "");
  const price = digits ? Number(digits) : null;
  if (Number.isFinite(garmentId) && process.env.DATABASE_URL) {
    try {
      await api.garments.update({ id: garmentId, purchasePrice: price });
    } catch {
      // ignore
    }
  }
  if (Number.isFinite(garmentId)) redirect(`/closet/${garmentId}`);
}
