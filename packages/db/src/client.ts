import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy Drizzle client. Importing this module never connects — the pool is created
 * on the first getDb() call, so the app boots fine without DATABASE_URL until a
 * DB-backed feature is actually used.
 */
let cached: PostgresJsDatabase<typeof schema> | undefined;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set it (see HANDOFF.md).",
    );
  }
  const client = postgres(url, { max: 10 });
  cached = drizzle(client, { schema, casing: "snake_case" });
  return cached;
}

export { schema };
