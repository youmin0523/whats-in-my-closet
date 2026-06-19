import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, personalColorProfiles } from "@closet/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { buildPersonalColor } from "../lib/personal-color";

export const personalColorRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [p] = await db
      .select()
      .from(personalColorProfiles)
      .where(eq(personalColorProfiles.userId, ctx.user.id));
    return p ?? null;
  }),

  submitQuiz: protectedProcedure
    .input(
      z.object({
        undertone: z.enum(["warm", "cool"]),
        value: z.enum(["light", "deep"]),
        chroma: z.enum(["bright", "muted"]),
        answers: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const pc = buildPersonalColor(input.undertone, input.value, input.chroma);
      const row = {
        userId: ctx.user.id,
        season: pc.season,
        undertone: pc.undertone,
        value: pc.value,
        chroma: pc.chroma,
        palette: pc.palette,
        quizAnswers: input.answers ?? null,
        updatedAt: new Date(),
      };
      await db
        .insert(personalColorProfiles)
        .values(row)
        .onConflictDoUpdate({
          target: personalColorProfiles.userId,
          set: row,
        });
      return pc;
    }),

  palette: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [p] = await db
      .select({ palette: personalColorProfiles.palette })
      .from(personalColorProfiles)
      .where(eq(personalColorProfiles.userId, ctx.user.id));
    return Array.isArray(p?.palette) ? (p.palette as string[]) : [];
  }),
});
