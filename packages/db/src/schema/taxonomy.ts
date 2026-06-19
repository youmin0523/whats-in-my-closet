import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Garment taxonomy. Column names are camelCase here but map to snake_case in the
 * database via the global `casing: "snake_case"` setting (client + drizzle.config).
 */
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  nameKo: text().notNull(),
  nameEn: text().notNull(),
  sort: integer().notNull().default(0),
  icon: text(),
  // shoes & socks are counted as pairs (켤레)
  countsAsPair: boolean().notNull().default(false),
});

export const subcategories = pgTable(
  "subcategories",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    nameKo: text().notNull(),
    nameEn: text().notNull(),
    sort: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("subcategory_slug_per_category").on(t.categoryId, t.slug)],
);
