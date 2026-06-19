import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { garments } from "./garments";

export const outfits = pgTable(
  "outfits",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text(),
    occasion: text(),
    // manual | ai_reco
    source: text().notNull().default("manual"),
    weatherSnapshot: jsonb(),
    season: text(),
    coverUrl: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outfits_user_idx").on(t.userId)],
);

export const outfitItems = pgTable(
  "outfit_items",
  {
    outfitId: integer()
      .notNull()
      .references(() => outfits.id, { onDelete: "cascade" }),
    garmentId: integer()
      .notNull()
      .references(() => garments.id, { onDelete: "cascade" }),
    // top | bottom | outer | shoes | acc
    role: text(),
  },
  (t) => [primaryKey({ columns: [t.outfitId, t.garmentId] })],
);

export const wearLogs = pgTable(
  "wear_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    garmentId: integer().references(() => garments.id, { onDelete: "cascade" }),
    outfitId: integer().references(() => outfits.id, { onDelete: "set null" }),
    wornOn: date(),
    weatherSnapshot: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wear_logs_user_date_idx").on(t.userId, t.wornOn)],
);
