import { defineConfig } from "drizzle-kit";

/**
 * Migrations only. `driver: "d1-http"` is a drizzle-kit setting — there is no
 * runtime d1-http driver, so queries go through `drizzle-orm/sqlite-proxy`
 * instead (see `src/db/client.ts`).
 *
 * Point CLOUDFLARE_D1_DATABASE_ID at the *dev* database when running locally.
 */
export default defineConfig({
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? "",
    token: process.env.CLOUDFLARE_D1_TOKEN ?? "",
  },
  dialect: "sqlite",
  driver: "d1-http",
  out: "./src/db/migrations",
  schema: "./src/db/schema/index.ts",
});
