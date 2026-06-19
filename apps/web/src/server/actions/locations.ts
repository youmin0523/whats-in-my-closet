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

export async function renameClosetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const closetId = Number(formData.get("closetId"));
  const name = String(formData.get("name") ?? "").trim();
  if (Number.isFinite(closetId) && name && process.env.DATABASE_URL) {
    try {
      await api.locations.renameCloset({ closetId, name });
    } catch {
      // ignore
    }
  }
  redirect("/locations");
}

export async function deleteClosetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const closetId = Number(formData.get("closetId"));
  if (Number.isFinite(closetId) && process.env.DATABASE_URL) {
    try {
      await api.locations.deleteCloset({ closetId });
    } catch {
      // ignore
    }
  }
  redirect("/locations");
}

export async function deleteContainerAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const containerId = Number(formData.get("containerId"));
  if (Number.isFinite(containerId) && process.env.DATABASE_URL) {
    try {
      await api.locations.deleteContainer({ containerId });
    } catch {
      // ignore
    }
  }
  redirect("/locations");
}
