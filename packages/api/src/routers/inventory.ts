import { and, arrayContains, desc, eq, isNotNull, sql } from "drizzle-orm";
import {
  categories,
  garmentColors,
  garments,
  getDb,
  subcategories,
} from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/** Real-time inventory counts by category (the "see inside" dashboard). */
export const inventoryRouter = createTRPCRouter({
  counts: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        categoryId: garments.categoryId,
        slug: categories.slug,
        nameKo: categories.nameKo,
        countsAsPair: categories.countsAsPair,
        items: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${garments.pairCount}), 0)::int`,
      })
      .from(garments)
      .leftJoin(categories, eq(categories.id, garments.categoryId))
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      )
      .groupBy(
        garments.categoryId,
        categories.slug,
        categories.nameKo,
        categories.countsAsPair,
      );

    const total = rows.reduce((s, r) => s + r.items, 0);

    // counts by subcategory (셔츠·블라우스·맨투맨·후드·청바지·치마 …)
    const bySubcategory = await db
      .select({
        categorySlug: categories.slug,
        categoryKo: categories.nameKo,
        subSlug: subcategories.slug,
        subKo: subcategories.nameKo,
        items: sql<number>`count(*)::int`,
      })
      .from(garments)
      .innerJoin(subcategories, eq(subcategories.id, garments.subcategoryId))
      .leftJoin(categories, eq(categories.id, garments.categoryId))
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      )
      .groupBy(
        categories.slug,
        categories.nameKo,
        subcategories.slug,
        subcategories.nameKo,
      );

    // counts by season (an item can belong to multiple seasons)
    const SEASONS = ["spring", "summer", "fall", "winter"] as const;
    const bySeason = await Promise.all(
      SEASONS.map(async (s) => {
        const [row] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(garments)
          .where(
            and(
              eq(garments.userId, ctx.user.id),
              eq(garments.status, "active"),
              arrayContains(garments.season, [s]),
            ),
          );
        return { season: s, items: row?.n ?? 0 };
      }),
    );

    // counts by dominant color family (the "색상 도넛" signature visual)
    const byColor = await db
      .select({
        family: garmentColors.colorFamily,
        items: sql<number>`count(distinct ${garments.id})::int`,
      })
      .from(garments)
      .innerJoin(
        garmentColors,
        and(
          eq(garmentColors.garmentId, garments.id),
          eq(garmentColors.rank, 0),
        ),
      )
      .where(
        and(
          eq(garments.userId, ctx.user.id),
          eq(garments.status, "active"),
          isNotNull(garmentColors.colorFamily),
        ),
      )
      .groupBy(garmentColors.colorFamily)
      .orderBy(desc(sql`count(distinct ${garments.id})`));

    return { total, byCategory: rows, bySubcategory, bySeason, byColor };
  }),

  /**
   * Potential-duplicate callout: clusters of active items sharing a subcategory
   * AND a dominant color family (≥2). Key-free — keys off color_family + subcategory.
   * Each cluster links to the closet filtered by that category + color.
   */
  duplicates: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        categorySlug: categories.slug,
        subKo: subcategories.nameKo,
        family: garmentColors.colorFamily,
        n: sql<number>`count(distinct ${garments.id})::int`,
      })
      .from(garments)
      .innerJoin(subcategories, eq(subcategories.id, garments.subcategoryId))
      .leftJoin(categories, eq(categories.id, garments.categoryId))
      .innerJoin(
        garmentColors,
        and(
          eq(garmentColors.garmentId, garments.id),
          eq(garmentColors.rank, 0),
        ),
      )
      .where(
        and(
          eq(garments.userId, ctx.user.id),
          eq(garments.status, "active"),
          isNotNull(garmentColors.colorFamily),
        ),
      )
      .groupBy(categories.slug, subcategories.nameKo, garmentColors.colorFamily)
      .having(sql`count(distinct ${garments.id}) >= 2`)
      .orderBy(desc(sql`count(distinct ${garments.id})`))
      .limit(8);
  }),

  /** Totals grouped by status (active/archived/donated/wishlist). */
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ status: garments.status, n: sql<number>`count(*)::int` })
      .from(garments)
      .where(eq(garments.userId, ctx.user.id))
      .groupBy(garments.status);
    const total = rows.reduce((s, r) => s + r.n, 0);
    return { total, byStatus: rows };
  }),
});
