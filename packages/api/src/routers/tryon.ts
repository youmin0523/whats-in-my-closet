import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getDb, tryOnResults } from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getFashnService } from "../services/fashn";

/** Virtual try-on (Phase 4) — FASHN when keyed, echo-base-photo fallback otherwise. */
export const tryonRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        basePhotoUrl: z.string().min(1),
        garmentImageUrl: z.string().min(1),
        garmentId: z.number().optional(),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const job = await getFashnService().run({
        modelImageUrl: input.basePhotoUrl,
        garmentImageUrl: input.garmentImageUrl,
        category: input.category,
      });
      const [row] = await db
        .insert(tryOnResults)
        .values({
          userId: ctx.user.id,
          basePhotoUrl: input.basePhotoUrl,
          garmentIds: input.garmentId ? [input.garmentId] : [],
          provider: "fashn",
          providerJobId: job.jobId,
          status: job.status,
          resultUrl: job.resultUrl,
        })
        .returning();
      return row;
    }),

  /** No-DB preview — run the model and return the result URL without persisting. */
  preview: protectedProcedure
    .input(
      z.object({
        basePhotoUrl: z.string().min(1),
        garmentImageUrl: z.string().min(1),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const job = await getFashnService().run({
        modelImageUrl: input.basePhotoUrl,
        garmentImageUrl: input.garmentImageUrl,
        category: input.category,
      });
      return {
        status: job.status,
        resultUrl: job.resultUrl ?? null,
        jobId: job.jobId,
      };
    }),

  status: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(tryOnResults)
        .where(
          and(
            eq(tryOnResults.id, input.id),
            eq(tryOnResults.userId, ctx.user.id),
          ),
        );
      return row ?? null;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(tryOnResults)
      .where(eq(tryOnResults.userId, ctx.user.id))
      .orderBy(desc(tryOnResults.createdAt))
      .limit(50);
  }),
});
