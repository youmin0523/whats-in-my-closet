import { categories, getDb, subcategories } from "@closet/db";
import { createTRPCRouter, publicProcedure } from "../trpc";

type Cat = {
  id: number;
  slug: string;
  nameKo: string;
  subs: { id: number; slug: string; nameKo: string }[];
};

/** Runtime config flags + the garment taxonomy (for classification pickers). */
export const systemRouter = createTRPCRouter({
  config: publicProcedure.query(() => ({
    dbConfigured: !!process.env.DATABASE_URL,
    storage: process.env.CLOUDINARY_CLOUD_NAME
      ? ("cloudinary" as const)
      : ("local" as const),
    devLogin:
      process.env.AUTH_DEV_LOGIN === "true" ||
      process.env.NODE_ENV !== "production",
  })),

  taxonomy: publicProcedure.query(async (): Promise<Cat[]> => {
    if (!process.env.DATABASE_URL) return [];
    const db = getDb();
    const cats = await db.select().from(categories).orderBy(categories.sort);
    const subs = await db
      .select()
      .from(subcategories)
      .orderBy(subcategories.sort);
    return cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameKo: c.nameKo,
      subs: subs
        .filter((s) => s.categoryId === c.id)
        .map((s) => ({ id: s.id, slug: s.slug, nameKo: s.nameKo })),
    }));
  }),
});
