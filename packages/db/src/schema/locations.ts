import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { garments } from "./garments";

/** A physical closet/wardrobe a user owns. */
export const closets = pgTable(
  "closets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    photoUrl: text(),
    layout: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("closets_user_idx").on(t.userId)],
);

/** Hierarchical storage: closet → zone/rod/shelf/drawer → box/cell. */
export const containers = pgTable(
  "containers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    closetId: integer()
      .notNull()
      .references(() => closets.id, { onDelete: "cascade" }),
    parentId: integer().references((): AnyPgColumn => containers.id, {
      onDelete: "cascade",
    }),
    // zone | rod | shelf | drawer | box | cell
    type: text().notNull(),
    name: text().notNull(),
    label: text(),
    position: jsonb(),
    capacity: integer(),
    sort: integer().notNull().default(0),
  },
  (t) => [index("containers_closet_parent_idx").on(t.closetId, t.parentId)],
);

/** One garment lives in exactly one place. */
export const garmentLocations = pgTable("garment_locations", {
  garmentId: integer()
    .primaryKey()
    .references(() => garments.id, { onDelete: "cascade" }),
  containerId: integer().references(() => containers.id, {
    onDelete: "set null",
  }),
  closetId: integer().references(() => closets.id, { onDelete: "set null" }),
  note: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
