import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { outfits } from "./outfits";

/** Cached daily AI outfit recommendations. */
export const recommendations = pgTable(
  "recommendations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forDate: date(),
    weatherSnapshot: jsonb(),
    constraints: jsonb(),
    outfits: jsonb(), // [{ garmentIds, rationale }]
    model: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recommendations_user_date_idx").on(t.userId, t.forDate)],
);

/** Virtual try-on jobs (FASHN). */
export const tryOnResults = pgTable(
  "try_on_results",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    basePhotoUrl: text(),
    garmentIds: integer().array(),
    outfitId: integer().references(() => outfits.id, { onDelete: "set null" }),
    provider: text().notNull().default("fashn"),
    providerJobId: text(),
    // queued | processing | done | failed
    status: text().notNull().default("queued"),
    resultUrl: text(),
    error: text(),
    costCredits: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("try_on_user_status_idx").on(t.userId, t.status)],
);
