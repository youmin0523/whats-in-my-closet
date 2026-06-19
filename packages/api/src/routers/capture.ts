import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  captureSessions,
  categories,
  garmentColors,
  garmentEmbeddings,
  garmentImages,
  garments,
  getDb,
  subcategories,
} from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { hexToColorFamily, hexToLab } from "../lib/color";
import { mapWithConcurrency } from "../lib/resilience";
import { buildTaxonomyHint, resolveTaxonomy } from "../lib/taxonomy";
import {
  EMBEDDING_MODEL,
  getDetectionService,
  getEmbeddingService,
  getTaggingService,
} from "../services";

const colors = z
  .array(z.object({ hex: z.string(), population: z.number().optional() }))
  .optional();

/**
 * Bulk capture. The web layer detects + crops items from the source photo (Claude
 * bbox or whole-image fallback) and uploads the crops, then calls startBulk to
 * auto-tag them into a draft session. The user confirms in the review screen → commit.
 *
 * Auto-tagging returns category/subcategory as free text; startBulk resolves those
 * onto the seeded taxonomy IDs so the review drafts (and the committed garments)
 * carry a real categoryId/subcategoryId — the inventory by-subcategory breakdown
 * and closet filters key off these.
 */
export const captureRouter = createTRPCRouter({
  startBulk: protectedProcedure
    .input(
      z.object({
        images: z.array(z.object({ imageUrl: z.string(), colors })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const tagging = getTaggingService();
      const [cats, subs] = await Promise.all([
        db.select().from(categories),
        db.select().from(subcategories),
      ]);
      const hint = buildTaxonomyHint(cats, subs);
      // Bound concurrency so a big upload doesn't fire N simultaneous model calls.
      const drafts = await mapWithConcurrency(input.images, 5, async (img) => {
        const tags = await tagging.tag(img.imageUrl, hint).catch(() => null);
        const { categoryId, subcategoryId } = resolveTaxonomy(
          cats,
          subs,
          tags?.category,
          tags?.subcategory,
        );
        return {
          imageUrl: img.imageUrl,
          name: tags?.name ?? null,
          category: tags?.category ?? null,
          subcategory: tags?.subcategory ?? null,
          categoryId: categoryId ?? null,
          subcategoryId: subcategoryId ?? null,
          season: tags?.season ?? [],
          colors: img.colors ?? [],
          tags,
        };
      });
      const [session] = await db
        .insert(captureSessions)
        .values({
          userId: ctx.user.id,
          type: "bulk",
          detectedCount: drafts.length,
          status: "review",
          draft: drafts,
        })
        .returning();
      return session;
    }),

  /** Detect garment regions in a single photo (Claude bbox / whole-image fallback). */
  detect: protectedProcedure
    .input(z.object({ imageUrl: z.string().min(1) }))
    .mutation(async ({ input }) => getDetectionService().detect(input.imageUrl)),

  commit: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().optional(),
        items: z.array(
          z.object({
            imageUrl: z.string(),
            name: z.string().nullish(),
            categoryId: z.number().nullish(),
            subcategoryId: z.number().nullish(),
            // Free-text fallbacks (detect flow has no IDs) — resolved server-side.
            category: z.string().nullish(),
            subcategory: z.string().nullish(),
            season: z.array(z.string()).optional(),
            colors,
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const embeddings = getEmbeddingService();
      const [cats, subs] = await Promise.all([
        db.select().from(categories),
        db.select().from(subcategories),
      ]);

      let createdCount = 0;
      for (const it of input.items) {
        // Prefer explicit IDs; otherwise resolve from any free-text tags.
        const resolved = resolveTaxonomy(cats, subs, it.category, it.subcategory);
        const categoryId = it.categoryId ?? resolved.categoryId;
        const subcategoryId = it.subcategoryId ?? resolved.subcategoryId;

        const [g] = await db
          .insert(garments)
          .values({
            userId: ctx.user.id,
            name: it.name ?? undefined,
            categoryId,
            subcategoryId,
            season: it.season?.length ? it.season : undefined,
            source: "bulk_capture",
            thumbnailUrl: it.imageUrl,
          })
          .returning();
        if (!g) continue;
        await db
          .insert(garmentImages)
          .values({ garmentId: g.id, url: it.imageUrl, isPrimary: true });
        if (it.colors?.length) {
          await db.insert(garmentColors).values(
            it.colors.map((c, i) => {
              const lab = hexToLab(c.hex);
              return {
                garmentId: g.id,
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
        try {
          const emb = await embeddings.embed(it.imageUrl);
          await db
            .insert(garmentEmbeddings)
            .values({ garmentId: g.id, embedding: emb, model: EMBEDDING_MODEL });
        } catch {
          // non-fatal
        }
        createdCount += 1;
      }
      if (input.sessionId) {
        await db
          .update(captureSessions)
          .set({ status: "committed" })
          .where(eq(captureSessions.id, input.sessionId));
      }
      return { created: createdCount };
    }),
});
