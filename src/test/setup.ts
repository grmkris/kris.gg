import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "@/db/schema";
import { createApi } from "@/server/create-api";

export interface TestUser {
  email: string;
  id: string;
  name: string;
}

export interface TestSetup {
  api: ReturnType<typeof createApi>;
  cleanup: () => void;
  close: () => void;
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: Database;
  users: {
    authenticated: TestUser;
  };
}

export const createTestSetup = async (): Promise<TestSetup> => {
  const sqlite = new Database(":memory:");
  const db = drizzle({ client: sqlite, schema });

  // Create tables (simplified schema for testing)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer))
    )
  `);

  const api = createApi({ db });

  // Create test user
  const testUser: TestUser = {
    email: "test@test.com",
    id: crypto.randomUUID(),
    name: "Test User",
  };

  await db.insert(schema.user).values({
    createdAt: new Date(),
    email: testUser.email,
    emailVerified: true,
    id: testUser.id,
    name: testUser.name,
    updatedAt: new Date(),
  });

  return {
    api,
    cleanup: () => {
      // Truncate all tables
      sqlite.run("DELETE FROM session");
      sqlite.run("DELETE FROM account");
      sqlite.run("DELETE FROM verification");
      sqlite.run("DELETE FROM user");
    },
    close: () => {
      sqlite.close();
    },
    db,
    sqlite,
    users: { authenticated: testUser },
  };
};

export const createTestContext = (setup: TestSetup) => ({
  db: setup.db,
  session: {
    session: {
      createdAt: new Date(),
      // 24 hours from now
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      updatedAt: new Date(),
      userId: setup.users.authenticated.id,
    },
    user: {
      createdAt: new Date(),
      email: setup.users.authenticated.email,
      emailVerified: true,
      id: setup.users.authenticated.id,
      image: null,
      name: setup.users.authenticated.name,
      updatedAt: new Date(),
    },
  },
  ...setup.api.services,
});

export const createUnauthenticatedContext = (setup: TestSetup) => ({
  db: setup.db,
  session: null,
  ...setup.api.services,
});
