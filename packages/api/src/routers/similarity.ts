import { z } from "zod";
import { and, cosineDistance, eq, ne, sql } from "drizzle-orm";
import { garmentColors, garmentEmbeddings, garments, getDb } from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { hexToLab, type Lab } from "../lib/color";
import { duplicateScore, duplicateScoreNoColor } from "../lib/scoring";
import { getEmbeddingService } from "../services/embeddings";

/**
 * Visual duplicate / similarity — the #1 differentiator.
 * Retrieval: pgvector HNSW cosine top-K, then rerank with the full duplicate-score
 * blend (embedding + CIEDE2000 color + category).
 */
export const similarityRouter = createTRPCRouter({
  /** "이미 비슷한 옷 있음?" — score a candidate image against the user's closet. */
  checkDuplicate: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().min(1),
        categoryId: z.number().nullish(),
        subcategoryId: z.number().nullish(),
        candidateColors: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const emb = await getEmbeddingService().embed(input.imageUrl);
      const distance = cosineDistance(garmentEmbeddings.embedding, emb);
      const candidateLab: Lab | null = input.candidateColors?.[0]
        ? hexToLab(input.candidateColors[0])
        : null;

      const rows = await db
        .select({
          garmentId: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          categoryId: garments.categoryId,
          subcategoryId: garments.subcategoryId,
          distance: sql<number>`${distance}`,
          labL: garmentColors.labL,
          labA: garmentColors.labA,
          labB: garmentColors.labB,
        })
        .from(garmentEmbeddings)
        .innerJoin(garments, eq(garments.id, garmentEmbeddings.garmentId))
        .leftJoin(
          garmentColors,
          and(
            eq(garmentColors.garmentId, garments.id),
            eq(garmentColors.rank, 0),
          ),
        )
        .where(eq(garments.userId, ctx.user.id))
        .orderBy(distance)
        .limit(20);

      const matches = rows
        .map((r) => {
          const cosine = 1 - r.distance;
          const sameSubcategory =
            input.subcategoryId != null &&
            r.subcategoryId === input.subcategoryId;
          const sameCategory =
            input.categoryId != null && r.categoryId === input.categoryId;
          const score =
            candidateLab && r.labL != null
              ? duplicateScore({
                  embeddingCosine: cosine,
                  labA: candidateLab,
                  labB: { L: r.labL, a: r.labA!, b: r.labB! },
                  sameSubcategory,
                  sameCategory,
                })
              : duplicateScoreNoColor({
                  embeddingCosine: cosine,
                  sameSubcategory,
                  sameCategory,
                });
          return {
            garmentId: r.garmentId,
            name: r.name,
            thumbnailUrl: r.thumbnailUrl,
            ...score,
          };
        })
        .sort((a, b) => b.score - a.score);

      const top = matches[0];
      return {
        matches,
        verdict: top?.verdict ?? ("none" as const),
        topScore: top?.score ?? 0,
      };
    }),

  /** "이 옷과 비슷한 것" — nearest owned items to an existing garment. */
  similarTo: protectedProcedure
    .input(
      z.object({
        garmentId: z.number(),
        limit: z.number().min(1).max(50).default(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [self] = await db
        .select({ embedding: garmentEmbeddings.embedding })
        .from(garmentEmbeddings)
        .where(eq(garmentEmbeddings.garmentId, input.garmentId));
      if (!self) return { matches: [] };

      const distance = cosineDistance(garmentEmbeddings.embedding, self.embedding);
      const rows = await db
        .select({
          garmentId: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          distance: sql<number>`${distance}`,
        })
        .from(garmentEmbeddings)
        .innerJoin(garments, eq(garments.id, garmentEmbeddings.garmentId))
        .where(
          and(eq(garments.userId, ctx.user.id), ne(garments.id, input.garmentId)),
        )
        .orderBy(distance)
        .limit(input.limit);

      return {
        matches: rows.map((r) => ({ ...r, similarity: 1 - r.distance })),
      };
    }),
});
