import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
  categories,
  garments,
  getDb,
  personalColorProfiles,
  recommendations,
} from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { constraintsSummaryKo, deriveConstraints } from "../lib/recommend";
import { getWeatherService } from "../services/weather";
import { getStylingService, stylistAnswer } from "../services/styling";

/**
 * Recommendation: weather → hard constraints (rule layer) → owned candidates →
 * LLM styling (Claude when keyed, heuristic otherwise), grounded to actual items.
 * Plus a free-form AI stylist Q&A.
 */
export const recommendationsRouter = createTRPCRouter({
  today: protectedProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const fc = await getWeatherService().forecast(input.lat, input.lng);
      const constraints = deriveConstraints(fc);

      const owned = await db
        .select({
          id: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          categorySlug: categories.slug,
        })
        .from(garments)
        .leftJoin(categories, eq(categories.id, garments.categoryId))
        .where(
          and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
        );

      const [profile] = await db
        .select({ palette: personalColorProfiles.palette })
        .from(personalColorProfiles)
        .where(eq(personalColorProfiles.userId, ctx.user.id));
      const palette = Array.isArray(profile?.palette)
        ? (profile.palette as string[])
        : [];

      const styling = await getStylingService().suggest({
        constraints,
        candidates: owned.map((g) => ({
          id: g.id,
          name: g.name,
          category: g.categorySlug,
        })),
        palette,
      });

      const byId = new Map(owned.map((g) => [g.id, g]));
      const outfit = styling.garmentIds
        .map((id) => byId.get(id))
        .filter((g): g is NonNullable<typeof g> => Boolean(g));

      return {
        forecast: fc,
        constraints,
        summary: constraintsSummaryKo(fc, constraints),
        outfit,
        rationale: styling.rationale,
        source: fc.source,
      };
    }),

  /** Free-form "오늘 뭐 입지?" stylist Q&A grounded to owned items. */
  ask: protectedProcedure
    .input(z.object({ question: z.string().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const owned = await db
        .select({
          id: garments.id,
          name: garments.name,
          thumbnailUrl: garments.thumbnailUrl,
          categorySlug: categories.slug,
        })
        .from(garments)
        .leftJoin(categories, eq(categories.id, garments.categoryId))
        .where(
          and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
        );

      const res = await stylistAnswer(
        input.question,
        owned.map((g) => ({ id: g.id, name: g.name, category: g.categorySlug })),
      );
      const byId = new Map(owned.map((g) => [g.id, g]));
      return {
        answer: res.answer,
        items: res.garmentIds
          .map((id) => byId.get(id))
          .filter((g): g is NonNullable<typeof g> => Boolean(g)),
      };
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, ctx.user.id))
      .orderBy(desc(recommendations.createdAt))
      .limit(30);
  }),
});
