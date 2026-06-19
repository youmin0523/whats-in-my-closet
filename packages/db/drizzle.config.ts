import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Secrets live in the repo-root .env (shared by db scripts).
config({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  // `generate` does not connect; this is only used by push/migrate/studio.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/closet_dev",
  },
  // pgvector needs the extension; we add `CREATE EXTENSION` to the first migration.
  verbose: true,
  strict: true,
});
