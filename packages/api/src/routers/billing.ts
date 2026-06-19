import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { garments, getDb, subscriptions, tryOnResults } from "@closet/db";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import {
  DEFAULT_PLAN,
  itemAllowance,
  PLAN_ORDER,
  PLANS,
  planFor,
  tryonAllowance,
} from "../lib/plan-limits";
import { getBillingService } from "../services/billing";

const planEnum = z.enum(["free", "premium", "premium_plus"]);

async function upsertSubscription(
  db: ReturnType<typeof getDb>,
  userId: string,
  set: {
    planSlug: string;
    status: string;
    provider: string | null;
    providerRef: string | null;
  },
) {
  const updatedAt = new Date();
  await db
    .insert(subscriptions)
    .values({ userId, ...set, updatedAt })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { ...set, updatedAt },
    });
}

/** Freemium billing — plan catalog, current usage, subscribe/cancel. */
export const billingRouter = createTRPCRouter({
  /** Plan catalog — pure, works with no DB/keys. */
  plans: publicProcedure.query(() => PLAN_ORDER.map((s) => PLANS[s])),

  /** The signed-in user's plan + live usage (items, monthly try-on credits). */
  current: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id));
    const planSlug =
      sub && sub.status !== "canceled" ? sub.planSlug : DEFAULT_PLAN;

    const [itemRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(garments)
      .where(
        and(eq(garments.userId, ctx.user.id), eq(garments.status, "active")),
      );
    const [tryonRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tryOnResults)
      .where(
        and(
          eq(tryOnResults.userId, ctx.user.id),
          gte(tryOnResults.createdAt, sql`date_trunc('month', now())`),
        ),
      );

    const itemCount = itemRow?.n ?? 0;
    const tryonUsed = tryonRow?.n ?? 0;
    return {
      plan: planFor(planSlug),
      status: sub?.status ?? "active",
      itemCount,
      items: itemAllowance(planSlug, itemCount),
      tryonUsed,
      tryon: tryonAllowance(planSlug, tryonUsed),
    };
  }),

  /** Start an upgrade. Dev (no PG key) activates now; real returns a checkout URL. */
  subscribe: protectedProcedure
    .input(z.object({ planSlug: planEnum }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Downgrade to free is immediate.
      if (input.planSlug === "free") {
        await upsertSubscription(db, ctx.user.id, {
          planSlug: "free",
          status: "active",
          provider: null,
          providerRef: null,
        });
        return { mode: "activated" as const };
      }

      const plan = planFor(input.planSlug);
      const res = await getBillingService().startCheckout({
        userId: ctx.user.id,
        planSlug: input.planSlug,
        priceKrw: plan.priceKrw,
      });

      if (res.mode === "activated") {
        await upsertSubscription(db, ctx.user.id, {
          planSlug: input.planSlug,
          status: "active",
          provider: res.provider,
          providerRef: res.ref,
        });
        return { mode: "activated" as const, simulated: res.simulated };
      }

      // Real PG: park as pending until the webhook confirms payment.
      await upsertSubscription(db, ctx.user.id, {
        planSlug: input.planSlug,
        status: "pending",
        provider: res.provider,
        providerRef: res.ref,
      });
      return { mode: "checkout" as const, checkoutUrl: res.checkoutUrl };
    }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getDb();
    await upsertSubscription(db, ctx.user.id, {
      planSlug: "free",
      status: "canceled",
      provider: null,
      providerRef: null,
    });
    return { ok: true };
  }),
});
