import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Bulk/single capture session — holds draft detections until the user confirms
 * them in the batch-review screen, at which point garments are committed.
 */
export const captureSessions = pgTable(
  "capture_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // bulk | single
    type: text().notNull(),
    sourceImageUrl: text(),
    detectedCount: integer().notNull().default(0),
    // detecting | review | committed | discarded
    status: text().notNull().default("detecting"),
    draft: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("capture_sessions_user_idx").on(t.userId, t.status)],
);
