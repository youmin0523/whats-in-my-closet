"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

type CellType = "shelf" | "rod" | "drawer" | "cell";
const TYPES: readonly string[] = ["shelf", "rod", "drawer", "cell"];

/** Persist a user-composed elevation as a closet + positioned/typed containers. */
export async function buildClosetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;

  const name = String(formData.get("name") ?? "").trim();
  let sections: { type: CellType; label?: string }[][] = [];
  try {
    const raw = JSON.parse(String(formData.get("sections") ?? "[]")) as unknown;
    if (Array.isArray(raw)) {
      sections = raw.map((col) =>
        (Array.isArray(col) ? col : [])
          .map((c) => ({ type: (c as { type?: string })?.type }))
          .filter((c): c is { type: CellType } =>
            TYPES.includes(c.type as string),
          ),
      );
    }
  } catch {
    sections = [];
  }

  if (!name || !sections.length || sections.every((c) => c.length === 0)) return;

  try {
    await api.locations.buildCloset({ name, sections });
  } catch {
    return;
  }
  revalidatePath("/locations");
  revalidatePath("/locations/map");
  redirect("/locations/map");
}
