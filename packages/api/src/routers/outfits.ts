import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getDb, outfitItems, outfits, wearLogs } from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/** Outfits (saved coordinations) + wear logs (Phase 1/3). */
export const outfitsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(outfits)
      .where(eq(outfits.userId, ctx.user.id))
      .orderBy(desc(outfits.createdAt))
      .limit(100);
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [o] = await db
        .select()
        .from(outfits)
        .where(and(eq(outfits.id, input.id), eq(outfits.userId, ctx.user.id)));
      if (!o) return null;
      const items = await db
        .select()
        .from(outfitItems)
        .where(eq(outfitItems.outfitId, input.id));
      return { ...o, items };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(80).optional(),
        occasion: z.string().max(60).optional(),
        garmentIds: z.array(z.number()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [o] = await db
        .insert(outfits)
        .values({
          userId: ctx.user.id,
          name: input.name,
          occasion: input.occasion,
          source: "manual",
        })
        .returning();
      if (!o) throw new Error("Failed to create outfit");
      if (input.garmentIds.length) {
        await db
          .insert(outfitItems)
          .values(input.garmentIds.map((gid) => ({ outfitId: o.id, garmentId: gid })))
          .onConflictDoNothing();
      }
      return o;
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        outfitId: z.number(),
        garmentId: z.number(),
        role: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .insert(outfitItems)
        .values({
          outfitId: input.outfitId,
          garmentId: input.garmentId,
          role: input.role,
        })
        .onConflictDoNothing();
      return { ok: true };
    }),

  /** Log that an item/outfit was worn (for cost-per-wear + usage stats). */
  logWear: protectedProcedure
    .input(
      z.object({
        garmentId: z.number().optional(),
        outfitId: z.number().optional(),
        wornOn: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [w] = await db
        .insert(wearLogs)
        .values({
          userId: ctx.user.id,
          garmentId: input.garmentId ?? null,
          outfitId: input.outfitId ?? null,
          wornOn: input.wornOn ?? null,
        })
        .returning();
      return w;
    }),
});
