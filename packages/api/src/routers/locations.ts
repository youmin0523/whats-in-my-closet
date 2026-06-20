import { z } from "zod";
import { and, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import {
  closets,
  containers,
  garmentLocations,
  garments,
  getDb,
} from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/** Physical location tracking — the #2 differentiator ("어디 뒀더라?"). */
export const locationsRouter = createTRPCRouter({
  closets: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(closets).where(eq(closets.userId, ctx.user.id));
  }),

  /** Cheap counts for the /closet onboarding checklist — 3 indexed COUNT(*)
   *  in parallel, instead of transferring the whole map() payload. */
  onboardingState: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const count = (q: Promise<{ n: number }[]>) => q.then((r) => r[0]?.n ?? 0);
    const [garmentCount, closetCount, placedCount] = await Promise.all([
      count(
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(garments)
          .where(
            and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
          ),
      ),
      count(
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(closets)
          .where(eq(closets.userId, ctx.user.id)),
      ),
      count(
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(garmentLocations)
          .innerJoin(garments, eq(garments.id, garmentLocations.garmentId))
          .where(
            and(
              eq(garments.userId, ctx.user.id),
              isNotNull(garmentLocations.containerId),
            ),
          ),
      ),
    ]);
    return {
      garments: garmentCount,
      closets: closetCount,
      placed: placedCount,
    };
  }),

  createCloset: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [c] = await db
        .insert(closets)
        .values({ userId: ctx.user.id, name: input.name })
        .returning();
      return c;
    }),

  containers: protectedProcedure
    .input(z.object({ closetId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(containers)
        .where(eq(containers.closetId, input.closetId));
    }),

  createContainer: protectedProcedure
    .input(
      z.object({
        closetId: z.number(),
        parentId: z.number().nullish(),
        type: z.string(),
        name: z.string().min(1),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [c] = await db
        .insert(containers)
        .values({
          closetId: input.closetId,
          parentId: input.parentId ?? null,
          type: input.type,
          name: input.name,
          label: input.label,
        })
        .returning();
      return c;
    }),

  /**
   * Build a closet from a user-composed **elevation** (앞에서 본 면): an array of
   * columns (left→right), each a stack of cells top→bottom. Each cell becomes a
   * container with a {col,row} position + type — which the 2D map renders as the
   * elevation and the 3D view extrudes into a wardrobe. (입면 → 2D·3D 자동 생성)
   */
  buildCloset: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(40),
        // columns → rows (top→bottom) → cells (left→right; a split shelf)
        sections: z
          .array(
            z
              .array(
                z
                  .array(
                    z.object({
                      type: z.enum(["shelf", "rod", "drawer", "cell"]),
                      label: z.string().max(20).optional(),
                    }),
                  )
                  .min(1)
                  .max(3),
              )
              .min(1)
              .max(20),
          )
          .min(1)
          .max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [closet] = await db
        .insert(closets)
        .values({
          userId: ctx.user.id,
          name: input.name,
          layout: input.sections,
        })
        .returning();
      if (!closet) throw new Error("Failed to create closet");

      const KO: Record<string, string> = {
        shelf: "선반",
        rod: "행거",
        drawer: "서랍",
        cell: "칸",
      };
      const rows = input.sections.flatMap((rowsInCol, col) =>
        rowsInCol.flatMap((cells, row) =>
          cells.map((cell, sub) => ({
            closetId: closet.id,
            type: cell.type,
            name:
              cell.label?.trim() ||
              `${col + 1}열 ${KO[cell.type]}${row + 1}${
                cells.length > 1 ? `-${sub + 1}` : ""
              }`,
            position: { col, row, sub },
            sort: col * 1000 + row * 10 + sub,
          })),
        ),
      );
      if (rows.length) await db.insert(containers).values(rows);
      return closet;
    }),

  renameCloset: protectedProcedure
    .input(z.object({ closetId: z.number(), name: z.string().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(closets)
        .set({ name: input.name })
        .where(
          and(eq(closets.id, input.closetId), eq(closets.userId, ctx.user.id)),
        );
      return { ok: true };
    }),

  /** Delete a closet + its containers; affected garments fall back to unassigned. */
  deleteCloset: protectedProcedure
    .input(z.object({ closetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [owned] = await db
        .select({ id: closets.id })
        .from(closets)
        .where(
          and(eq(closets.id, input.closetId), eq(closets.userId, ctx.user.id)),
        );
      if (!owned) return { ok: false };
      await db
        .delete(garmentLocations)
        .where(eq(garmentLocations.closetId, input.closetId));
      await db
        .delete(containers)
        .where(eq(containers.closetId, input.closetId));
      await db.delete(closets).where(eq(closets.id, input.closetId));
      return { ok: true };
    }),

  /** Delete one container; its garments fall back to closet-level (loose). */
  deleteContainer: protectedProcedure
    .input(z.object({ containerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // ownership: the container's closet must belong to the user
      const [row] = await db
        .select({ closetId: containers.closetId })
        .from(containers)
        .innerJoin(closets, eq(closets.id, containers.closetId))
        .where(
          and(
            eq(containers.id, input.containerId),
            eq(closets.userId, ctx.user.id),
          ),
        );
      if (!row) return { ok: false };
      await db
        .update(garmentLocations)
        .set({ containerId: null })
        .where(eq(garmentLocations.containerId, input.containerId));
      await db.delete(containers).where(eq(containers.id, input.containerId));
      return { ok: true };
    }),

  assign: protectedProcedure
    .input(
      z.object({
        garmentId: z.number(),
        containerId: z.number().nullish(),
        closetId: z.number().nullish(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const row = {
        garmentId: input.garmentId,
        containerId: input.containerId ?? null,
        closetId: input.closetId ?? null,
        note: input.note,
        updatedAt: new Date(),
      };
      await db
        .insert(garmentLocations)
        .values(row)
        .onConflictDoUpdate({ target: garmentLocations.garmentId, set: row });
      return { ok: true };
    }),

  /**
   * Full 2D layout for the visual map: every closet with its containers, the
   * garments in each, plus loose (closet-level) and fully unassigned items.
   * Powers drag-to-assign on /locations/map.
   */
  map: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    type Item = {
      garmentId: number;
      name: string | null;
      thumbnailUrl: string | null;
    };

    const cl = await db
      .select()
      .from(closets)
      .where(eq(closets.userId, ctx.user.id));
    const ids = cl.map((c) => c.id);
    const cont = ids.length
      ? await db
          .select()
          .from(containers)
          .where(inArray(containers.closetId, ids))
      : [];

    const rows = await db
      .select({
        garmentId: garments.id,
        name: garments.name,
        thumbnailUrl: garments.thumbnailUrl,
        containerId: garmentLocations.containerId,
        closetId: garmentLocations.closetId,
      })
      .from(garments)
      .leftJoin(garmentLocations, eq(garmentLocations.garmentId, garments.id))
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      )
      .limit(500);

    const byContainer = new Map<number, Item[]>();
    const byClosetLoose = new Map<number, Item[]>();
    const unassigned: Item[] = [];
    for (const r of rows) {
      const item: Item = {
        garmentId: r.garmentId,
        name: r.name,
        thumbnailUrl: r.thumbnailUrl,
      };
      if (r.containerId != null) {
        const a = byContainer.get(r.containerId) ?? [];
        a.push(item);
        byContainer.set(r.containerId, a);
      } else if (r.closetId != null) {
        const a = byClosetLoose.get(r.closetId) ?? [];
        a.push(item);
        byClosetLoose.set(r.closetId, a);
      } else {
        unassigned.push(item);
      }
    }

    return {
      closets: cl.map((c) => ({
        id: c.id,
        name: c.name,
        loose: byClosetLoose.get(c.id) ?? [],
        containers: cont
          .filter((ct) => ct.closetId === c.id)
          .map((ct) => ({
            id: ct.id,
            name: ct.name,
            type: ct.type,
            position: ct.position as {
              col: number;
              row: number;
              sub?: number;
            } | null,
            garments: byContainer.get(ct.id) ?? [],
          })),
      })),
      unassigned,
    };
  }),

  /** "내 네이비 니트 어디?" — find garments by name + where they're stored. */
  find: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select({
          garmentId: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          containerId: garmentLocations.containerId,
          closetId: garmentLocations.closetId,
          note: garmentLocations.note,
        })
        .from(garments)
        .leftJoin(
          garmentLocations,
          eq(garmentLocations.garmentId, garments.id),
        )
        .where(
          and(
            eq(garments.userId, ctx.user.id),
            ilike(garments.name, `%${input.query}%`),
          ),
        )
        .limit(20);
    }),
});
