/**
 * Drizzle over Cloudflare D1's HTTP API.
 *
 * The site runs on Vercel, so the native `drizzle-orm/d1` driver is unavailable —
 * it needs a Workers `D1Database` binding. Drizzle's `driver: "d1-http"` is a
 * *drizzle-kit* (migration) setting, not a runtime driver. So the runtime path is
 * `drizzle-orm/sqlite-proxy` with the callback below POSTing to D1's REST API.
 *
 * Cost of this shape: every query is one Vercel → Cloudflare HTTPS round-trip.
 * Keep queries few and fat; never issue one per row. better-auth's `cookieCache`
 * (see `src/lib/auth.ts`) exists to keep session checks off this path entirely.
 *
 * Transactions are deliberately unsupported — see `assertNoTransaction` below.
 */

import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema";

const D1_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * Shape of the `/raw` endpoint. Unlike `/query` (which returns row *objects*),
 * `/raw` returns `results: { columns, rows }` with rows as positional arrays —
 * which is what sqlite-proxy's `values` contract expects, so no key-order
 * reconstruction is needed.
 */
interface D1RawResult {
  success: boolean;
  result?: {
    results?: { columns?: string[]; rows?: unknown[][] };
    success?: boolean;
    meta?: unknown;
  }[];
  errors?: { code: number; message: string }[];
}

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing ${name}. D1 access needs CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_D1_TOKEN.`
    );
  }
  return value;
};

/**
 * D1's REST endpoint is stateless: each POST is an independent connection, so a
 * `BEGIN` in one request and a `COMMIT` in another describe nothing. Drizzle's
 * sqlite-proxy session implements `transaction()` by emitting exactly those as
 * separate calls, which would silently apply partial writes instead of failing.
 * Fail loudly instead — the schema is designed so no mutation needs more than
 * one statement.
 */
export const assertNoTransaction = (sql: string): void => {
  const head = sql.trimStart().slice(0, 16).toLowerCase();
  if (
    head.startsWith("begin") ||
    head.startsWith("commit") ||
    head.startsWith("rollback") ||
    head.startsWith("savepoint") ||
    head.startsWith("release")
  ) {
    throw new Error(
      `D1 does not support transactions over its HTTP API (attempted: ${head.trim()}). Restructure the mutation to a single statement.`
    );
  }
};

const queryD1 = async (
  sql: string,
  params: unknown[]
): Promise<unknown[][]> => {
  const accountId = required("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = required("CLOUDFLARE_D1_DATABASE_ID");
  const token = required("CLOUDFLARE_D1_TOKEN");

  const response = await fetch(
    `${D1_API_BASE}/${accountId}/d1/database/${databaseId}/raw`,
    {
      body: JSON.stringify({ params, sql }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(`D1 HTTP ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as D1RawResult;
  if (!body.success) {
    const detail = body.errors?.map((e) => e.message).join("; ") ?? "unknown";
    throw new Error(`D1 query failed: ${detail}`);
  }

  return body.result?.[0]?.results?.rows ?? [];
};

export const db = drizzle(
  async (sql, params, method) => {
    assertNoTransaction(sql);
    const rows = await queryD1(sql, params);
    // drizzle-orm/sqlite-proxy contract: `get` returns a single row, everything
    // else returns the full set. `run` discards the payload.
    return { rows: method === "get" ? (rows[0] ?? []) : rows };
  },
  { schema }
);

export type Db = typeof db;
