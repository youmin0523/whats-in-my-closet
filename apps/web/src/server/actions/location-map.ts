"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/server/api";
import { auth } from "@/server/auth";

/**
 * Move a garment to a container / closet / nowhere (drag-and-drop on the 2D map).
 * Called programmatically from the client map; revalidates the route so the
 * server-rendered layout reflects the new placement.
 */
export async function moveGarment(
  garmentId: number,
  closetId: number | null,
  containerId: number | null,
): Promise<void> {
  const session = await auth();
  if (!session?.user || !process.env.DATABASE_URL) return;
  try {
    await api.locations.assign({ garmentId, closetId, containerId });
  } catch {
    // ignore — keep the UI responsive
  }
  revalidatePath("/locations/map");
}
