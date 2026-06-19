import { z } from "zod";
import { and, eq, ilike, inArray } from "drizzle-orm";
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
