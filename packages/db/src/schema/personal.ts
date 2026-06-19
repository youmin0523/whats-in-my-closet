import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

/** Korean 4-season personal color profile (퍼스널컬러). */
export const personalColorProfiles = pgTable("personal_color_profiles", {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // spring | summer | fall | winter
  season: text(),
  undertone: text(), // warm | cool
  value: text(), // light | deep
  chroma: text(), // bright | muted
  palette: jsonb(), // recommended hex[]
  quizAnswers: jsonb(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Subscription plans (freemium). */
export const plans = pgTable("plans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // free | premium | premium_plus
  slug: text().notNull().unique(),
  nameKo: text().notNull(),
  maxItems: integer(), // null = unlimited
  monthlyTryonCredits: integer().notNull().default(0),
  priceKrw: integer().notNull().default(0),
  features: jsonb(),
});

/** A user's current subscription (one row per user; absent = free plan). */
export const subscriptions = pgTable("subscriptions", {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // free | premium | premium_plus
  planSlug: text().notNull().default("free"),
  // active | pending | past_due | canceled
  status: text().notNull().default("active"),
  provider: text(), // portone | toss | null (dev)
  providerRef: text(), // checkout / billing-key reference
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp({ withTimezone: true }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
