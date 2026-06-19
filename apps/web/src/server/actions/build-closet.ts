"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

type CellType = "shelf" | "rod" | "drawer" | "cell";
type Cell = { type: CellType };
const TYPES: readonly string[] = ["shelf", "rod", "drawer", "cell"];

/**
 * Persist a user-composed elevation as a closet + positioned/typed containers.
 * Shape: columns → rows (top→bottom) → cells (left→right, a horizontally split
 * shelf). Empty rows/columns are dropped so stored col/row indices stay
 * contiguous (a gap would render phantom empty columns downstream).
 */
export async function buildClosetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;

  const name = String(formData.get("name") ?? "").trim();
  let sections: Cell[][][] = [];
  try {
    const raw = JSON.parse(String(formData.get("sections") ?? "[]")) as unknown;
    if (Array.isArray(raw)) {
      sections = raw
        .map((col) =>
          (Array.isArray(col) ? col : [])
            .map((row) =>
              (Array.isArray(row) ? row : [])
                .map((c) => ({ type: (c as { type?: string })?.type }))
                .filter((c): c is Cell => TYPES.includes(c.type as string))
                .slice(0, 3),
            )
            .filter((row) => row.length > 0),
        )
        .filter((col) => col.length > 0)
        .slice(0, 12);
    }
  } catch {
    sections = [];
  }

  if (!name || !sections.length) return;

  try {
    await api.locations.buildCloset({ name, sections });
  } catch {
    return;
  }
  revalidatePath("/locations");
  revalidatePath("/locations/map");
  redirect("/locations/map");
}
