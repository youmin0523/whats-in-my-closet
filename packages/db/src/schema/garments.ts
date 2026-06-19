import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { categories, subcategories } from "./taxonomy";

export const garments = pgTable(
  "garments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer().references(() => categories.id),
    subcategoryId: integer().references(() => subcategories.id),
    name: text(),
    brand: text(),
    size: text(),
    material: text(),
    pattern: text(),
    fit: text(),
    season: text().array(),
    style: text().array(),
    pairCount: integer().notNull().default(1),
    purchasePrice: integer(), // KRW — for cost-per-wear
    thumbnailUrl: text(),
    // active | archived | donated | wishlist
    status: text().notNull().default("active"),
    aiConfidence: doublePrecision(),
    // bulk_capture | single_capture | manual
    source: text().notNull().default("manual"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("garments_user_category_idx").on(t.userId, t.categoryId),
    index("garments_user_status_idx").on(t.userId, t.status),
  ],
);

export const garmentImages = pgTable(
  "garment_images",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    garmentId: integer()
      .notNull()
      .references(() => garments.id, { onDelete: "cascade" }),
    cloudinaryPublicId: text(),
    url: text().notNull(),
    bgRemovedUrl: text(),
    width: integer(),
    height: integer(),
    isPrimary: boolean().notNull().default(false),
    // normalized detection box {x,y,w,h} from bulk capture
    bbox: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("garment_images_garment_idx").on(t.garmentId)],
);

/**
 * Marqo-FashionSigLIP image embeddings (768-dim, L2-normalized) for visual
 * similarity / duplicate detection. HNSW + cosine index (see /DESIGN-plan).
 */
export const garmentEmbeddings = pgTable(
  "garment_embeddings",
  {
    garmentId: integer()
      .primaryKey()
      .references(() => garments.id, { onDelete: "cascade" }),
    embedding: vector({ dimensions: 768 }).notNull(),
    model: text().notNull().default("marqo-fashionSigLIP"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("garment_embeddings_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const garmentColors = pgTable(
  "garment_colors",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    garmentId: integer()
      .notNull()
      .references(() => garments.id, { onDelete: "cascade" }),
    rank: integer().notNull(),
    hex: text().notNull(),
    // CIE Lab for CIEDE2000 color-distance scoring
    labL: doublePrecision().notNull(),
    labA: doublePrecision().notNull(),
    labB: doublePrecision().notNull(),
    population: doublePrecision(),
    // coarse color bucket (white|black|navy|beige…) for the closet color filter
    colorFamily: text(),
  },
  (t) => [
    index("garment_colors_garment_idx").on(t.garmentId, t.rank),
    index("garment_colors_family_idx").on(t.colorFamily),
  ],
);
