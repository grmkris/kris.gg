/* eslint-disable eslint-plugin-jest/require-hook */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { env } from "@/env/server";

const sqlite = new Database(env.DATABASE_URL);
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./src/db/migrations" });
