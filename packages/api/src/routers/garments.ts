import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, arrayContains, desc, eq, sql } from "drizzle-orm";
import {
  categories,
  closets,
  containers,
  garmentColors,
  garmentEmbeddings,
  garmentImages,
  garmentLocations,
  garments,
  getDb,
  subcategories,
  subscriptions,
  wearLogs,
} from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { hexToColorFamily, hexToLab } from "../lib/color";
import { DEFAULT_PLAN, itemAllowance } from "../lib/plan-limits";
import { buildProductQuery } from "../lib/enrichment-query";
import { buildTaxonomyHint, resolveTaxonomy } from "../lib/taxonomy";
import { EMBEDDING_MODEL, getEmbeddingService } from "../services/embeddings";
import { getEnrichmentService } from "../services/enrichment";
import { getTagReaderService } from "../services/tag-reader";
import { getTaggingService } from "../services/tagging";

const colorInput = z
  .array(z.object({ hex: z.string(), population: z.number().optional() }))
  .optional();

export const garmentsRouter = createTRPCRouter({
  /** List the signed-in user's garments (newest first), optional category filter. */
  list: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          status: z.string().optional(),
          season: z.string().optional(),
          color: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select({
          id: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          categoryId: garments.categoryId,
        })
        .from(garments)
        .leftJoin(categories, eq(categories.id, garments.categoryId))
        // dominant color (rank 0) — only needed when filtering by color
        .leftJoin(
          garmentColors,
          and(
            eq(garmentColors.garmentId, garments.id),
            eq(garmentColors.rank, 0),
          ),
        )
        .where(
          and(
            eq(garments.userId, ctx.user.id),
            eq(garments.status, input?.status ?? "active"),
            input?.category ? eq(categories.slug, input.category) : undefined,
            input?.season
              ? arrayContains(garments.season, [input.season])
              : undefined,
            input?.color
              ? eq(garmentColors.colorFamily, input.color)
              : undefined,
          ),
        )
        .orderBy(desc(garments.createdAt))
        .limit(200);
    }),

  /** A single garment with its location + dominant colors. */
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [g] = await db
        .select()
        .from(garments)
        .where(and(eq(garments.id, input.id), eq(garments.userId, ctx.user.id)));
      if (!g) return null;
      const [location] = await db
        .select()
        .from(garmentLocations)
        .where(eq(garmentLocations.garmentId, input.id));
      const colors = await db
        .select()
        .from(garmentColors)
        .where(eq(garmentColors.garmentId, input.id))
        .orderBy(garmentColors.rank);
      const [wear] = await db
        .select({
          count: sql<number>`count(*)::int`,
          last: sql<string | null>`max(${wearLogs.wornOn})`,
        })
        .from(wearLogs)
        .where(
          and(
            eq(wearLogs.garmentId, input.id),
            eq(wearLogs.userId, ctx.user.id),
          ),
        );
      return {
        ...g,
        location: location ?? null,
        colors,
        wearCount: wear?.count ?? 0,
        lastWornOn: wear?.last ?? null,
      };
    }),

  /** Read a clothing tag/label photo → structured product info (Claude vision; no DB). */
  readTag: protectedProcedure
    .input(z.object({ imageUrl: z.string().min(1) }))
    .mutation(async ({ input }) => getTagReaderService().read(input.imageUrl)),

  /** Match a read tag to real catalog products (Naver 쇼핑; [] without keys). */
  searchProduct: protectedProcedure
    .input(
      z.object({
        brand: z.string().nullish(),
        productName: z.string().nullish(),
        query: z.string().nullish(),
        limit: z.number().min(1).max(10).default(5),
      }),
    )
    .query(async ({ input }) => {
      const q = input.query?.trim() || buildProductQuery(input);
      if (!q) return [];
      return getEnrichmentService().search(q, input.limit);
    }),

  /** Create a garment from an uploaded image (single-item capture). */
  create: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().min(1),
        bgRemovedUrl: z.string().nullable().optional(),
        cloudinaryPublicId: z.string().nullable().optional(),
        name: z.string().max(120).optional(),
        brand: z.string().max(80).optional(),
        size: z.string().max(40).optional(),
        material: z.string().max(160).optional(),
        purchasePrice: z.number().int().nonnegative().optional(),
        status: z.enum(["active", "wishlist"]).optional(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        season: z.array(z.string()).optional(),
        colors: colorInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Freemium: enforce the plan's item cap (free = 100). Wishlist items don't
      // count toward the active wardrobe.
      if ((input.status ?? "active") !== "wishlist") {
        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id));
        const planSlug =
          sub && sub.status !== "canceled" ? sub.planSlug : DEFAULT_PLAN;
        const [cnt] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(garments)
          .where(
            and(
              eq(garments.userId, ctx.user.id),
              eq(garments.status, "active"),
            ),
          );
        if (!itemAllowance(planSlug, cnt?.n ?? 0).allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "보관 한도에 도달했어요. 요금제를 업그레이드하면 옷을 무제한으로 보관할 수 있어요.",
          });
        }
      }

      // Kick off the embedding now so it runs *concurrently* with auto-tagging
      // below — total latency ≈ max(embed, tag), not the sum.
      const embedPromise = getEmbeddingService()
        .embed(input.imageUrl)
        .catch(() => null);

      // Auto-tag when the user left the category blank: AI fills
      // category/subcategory/season/name (all editable later on the detail
      // page). Skipped when a category was provided or no model key is set, so
      // the fast path stays fast.
      let { name, categoryId, subcategoryId, season } = input;
      if (categoryId == null) {
        const tagging = getTaggingService();
        if (tagging.isReal) {
          const [cats, subs] = await Promise.all([
            db.select().from(categories),
            db.select().from(subcategories),
          ]);
          const tags = await tagging
            .tag(input.imageUrl, buildTaxonomyHint(cats, subs))
            .catch(() => null);
          if (tags) {
            const r = resolveTaxonomy(cats, subs, tags.category, tags.subcategory);
            categoryId = r.categoryId ?? undefined;
            subcategoryId = subcategoryId ?? r.subcategoryId ?? undefined;
            if (!season?.length && tags.season?.length) season = tags.season;
            if (!name && tags.name) name = tags.name;
          }
        }
      }

      const [created] = await db
        .insert(garments)
        .values({
          userId: ctx.user.id,
          name,
          brand: input.brand,
          size: input.size,
          material: input.material,
          purchasePrice: input.purchasePrice,
          categoryId,
          subcategoryId,
          season,
          source: "single_capture",
          status: input.status ?? "active",
          thumbnailUrl: input.imageUrl,
        })
        .returning();
      if (!created) throw new Error("Failed to create garment");

      await db.insert(garmentImages).values({
        garmentId: created.id,
        url: input.imageUrl,
        bgRemovedUrl: input.bgRemovedUrl ?? null,
        cloudinaryPublicId: input.cloudinaryPublicId ?? null,
        isPrimary: true,
      });

      // Dominant colors → Lab (for CIEDE2000 color matching).
      if (input.colors?.length) {
        await db.insert(garmentColors).values(
          input.colors.map((c, i) => {
            const lab = hexToLab(c.hex);
            return {
              garmentId: created.id,
              rank: i,
              hex: c.hex,
              labL: lab.L,
              labA: lab.a,
              labB: lab.b,
              population: c.population ?? null,
              colorFamily: hexToColorFamily(c.hex),
            };
          }),
        );
      }

      // Fashion embedding (powers duplicate detection) — started above, awaited
      // here so it overlapped the tagging call. Non-fatal on failure.
      const embedding = await embedPromise;
      if (embedding) {
        try {
          await db
            .insert(garmentEmbeddings)
            .values({ garmentId: created.id, embedding, model: EMBEDDING_MODEL });
        } catch {
          // ignore — embedding can be backfilled later
        }
      }

      return created;
    }),

  /** Move a garment between states (active/archived/donated/wishlist). */
  archive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum(["active", "archived", "donated", "wishlist"])
          .default("archived"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(garments)
        .set({ status: input.status })
        .where(and(eq(garments.id, input.id), eq(garments.userId, ctx.user.id)));
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(garments)
        .where(and(eq(garments.id, input.id), eq(garments.userId, ctx.user.id)));
      return { ok: true };
    }),

  /** Edit attributes (name, brand/size/material, category·subcategory, season, status, price). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().max(120).nullable().optional(),
        brand: z.string().max(80).nullable().optional(),
        size: z.string().max(40).nullable().optional(),
        material: z.string().max(160).nullable().optional(),
        purchasePrice: z.number().int().nonnegative().nullable().optional(),
        categoryId: z.number().nullable().optional(),
        subcategoryId: z.number().nullable().optional(),
        season: z.array(z.string()).optional(),
        status: z
          .enum(["active", "archived", "donated", "wishlist"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const set: Partial<typeof garments.$inferInsert> = {};
      if (input.name !== undefined) set.name = input.name;
      if (input.brand !== undefined) set.brand = input.brand;
      if (input.size !== undefined) set.size = input.size;
      if (input.material !== undefined) set.material = input.material;
      if (input.purchasePrice !== undefined)
        set.purchasePrice = input.purchasePrice;
      if (input.categoryId !== undefined) set.categoryId = input.categoryId;
      if (input.subcategoryId !== undefined)
        set.subcategoryId = input.subcategoryId;
      if (input.season !== undefined) set.season = input.season;
      if (input.status !== undefined) set.status = input.status;
      if (Object.keys(set).length === 0) return { ok: true };
      set.updatedAt = new Date();
      await db
        .update(garments)
        .set(set)
        .where(and(eq(garments.id, input.id), eq(garments.userId, ctx.user.id)));
      return { ok: true };
    }),

  /** Least-worn active items (dead stock — the anti-waste view). */
  leastWorn: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(8) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select({
          id: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          wears: sql<number>`count(${wearLogs.id})::int`,
        })
        .from(garments)
        .leftJoin(wearLogs, eq(wearLogs.garmentId, garments.id))
        .where(
          and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
        )
        .groupBy(garments.id, garments.name, garments.thumbnailUrl)
        .orderBy(sql`count(${wearLogs.id}) asc`)
        .limit(input.limit);
    }),

  /** Active garments with their dominant color — for the 3D closet view. */
  list3d: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: garments.id,
        name: garments.name,
        hex: garmentColors.hex,
      })
      .from(garments)
      .leftJoin(
        garmentColors,
        and(
          eq(garmentColors.garmentId, garments.id),
          eq(garmentColors.rank, 0),
        ),
      )
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      )
      .limit(60);
  }),

  /**
   * Active garments tagged with their physical location (closet + container) and
   * dominant color — powers the location-based 3D closet (Phase 6). Items with no
   * location come back with null closet/container (rendered as a "미분류" rack).
   */
  scene3d: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: garments.id,
        name: garments.name,
        hex: garmentColors.hex,
        closetId: garmentLocations.closetId,
        closetName: closets.name,
        containerId: garmentLocations.containerId,
        containerName: containers.name,
        containerType: containers.type,
        containerPosition: containers.position,
      })
      .from(garments)
      .leftJoin(
        garmentColors,
        and(
          eq(garmentColors.garmentId, garments.id),
          eq(garmentColors.rank, 0),
        ),
      )
      .leftJoin(garmentLocations, eq(garmentLocations.garmentId, garments.id))
      .leftJoin(closets, eq(closets.id, garmentLocations.closetId))
      .leftJoin(containers, eq(containers.id, garmentLocations.containerId))
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      )
      .limit(300);
  }),
});
