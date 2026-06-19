"use server";

import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

export async function createClosetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const name = String(formData.get("name") ?? "").trim();
  if (name && process.env.DATABASE_URL) {
    try {
      await api.locations.createCloset({ name });
    } catch {
      // ignore
    }
  }
  redirect("/locations");
}

export async function createContainerAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const closetId = Number(formData.get("closetId"));
  const name = String(formData.get("name") ?? "").trim();
  if (Number.isFinite(closetId) && name && process.env.DATABASE_URL) {
    try {
      await api.locations.createContainer({ closetId, type: "drawer", name });
    } catch {
      // ignore
    }
  }
  redirect("/locations");
}
