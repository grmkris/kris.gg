---
name: drizzle-patterns
description: Storage rules for kris.gg — Cloudflare D1 over its HTTP API via drizzle sqlite-proxy. Covers the no-transactions constraint, one-statement mutations, ownership in the WHERE, the /raw row mapping, and migrations. Use when writing a query, changing the schema, or debugging a query that returns nothing.
globs:
  - src/db/**/*.ts
  - src/stash/store.ts
  - src/planner/store.ts
  - drizzle.config.ts
alwaysApply: false
---

# Storage Patterns — Cloudflare D1 over HTTP

The site runs on Vercel, so there is **no D1 binding**. `drizzle-orm/d1` needs a
Workers `D1Database` and is unusable here. `driver: "d1-http"` in
`drizzle.config.ts` is a **drizzle-kit (migration) setting**, not a runtime
driver. Runtime goes through `drizzle-orm/sqlite-proxy`, with the callback in
`src/db/client.ts` POSTing to D1's REST API.

Two consequences drive everything below: **every query is one
Vercel → Cloudflare HTTPS round trip**, and **there are no transactions**.

## 1. No transactions. Every mutation is ONE statement.

D1's REST endpoint is stateless — each POST is an independent connection, so a
`BEGIN` in one request and a `COMMIT` in another describe nothing. Drizzle's
sqlite-proxy session implements `transaction()` by emitting exactly those as
separate calls, which would silently apply **partial writes**.

`assertNoTransaction` in `src/db/client.ts` fails loudly instead. Do not weaken
it. Restructure the mutation.

This is a schema constraint, not just a query one: model anything that must be
written atomically as **one row**. Attachments live in a JSON column on
`stash_item` rather than a child table for exactly this reason.

## 2. Ownership goes in the WHERE — never read-then-write

Without transactions, "fetch the row, check `userId`, then update" is a race and
a second round trip. Put the owner in the predicate so a wrong owner simply
matches nothing:

```ts
// Good — one statement, ownership enforced by the database
db.update(stashItem)
  .set({ done: true })
  .where(and(eq(stashItem.id, id), eq(stashItem.userId, userId)))
  .returning();

// Bad — two round trips and a race
const row = await db.select().from(stashItem).where(eq(stashItem.id, id));
if (row[0]?.userId !== userId) throw ...
```

A zero-row `.returning()` is how you detect "not found **or** not yours" — treat
both as `NotFound`, never leak which.

## 3. The `/raw` row mapping fails silently

`src/db/client.ts` reads `body.result[0].results.rows` from D1's **`/raw`**
endpoint, which returns positional arrays — exactly sqlite-proxy's `values`
contract. `/query` would return row *objects* and force fragile key-order
reconstruction.

If that path is ever wrong, the driver returns an **empty array instead of
throwing**. Every query then looks like "no rows", forever, with nothing in the
logs. Same for the column decodes: D1 stores booleans as integers, timestamps as
integers and JSON as text, and a bad decode surfaces as a *wrong value*, not an
error.

**After touching `src/db/client.ts` or a store, run the guard:**

```bash
bun run scripts/d1-smoke.ts
```

It round-trips a real item and asserts the mappings that fail quietly: the rows
path, int→boolean, epoch-ms→`Date`, JSON text→array, cross-user rejection, and
that `assertNoTransaction` is still armed.

## 4. Latency is the design constraint

Keep queries few and fat; never issue one per row. better-auth's
`session.cookieCache` (`src/lib/auth.ts`) exists so session checks don't pay the
round trip — it is load-bearing, not an optimisation.

On the client, assume every write costs a visible round trip and update
optimistically. See `frontend-patterns`.

## 5. Schema and migrations

Tables live in `src/db/schema/`, exported from `src/db/schema/index.ts` (drizzle
needs one schema object — that barrel is deliberate).

```ts
export const stashItem = sqliteTable("stash_item", {
  id: text("id").primaryKey().$defaultFn(() => `stx_${crypto.randomUUID().replaceAll("-", "")}`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  // JSON arrays: D1 has no array type, and a child table would need a transaction
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [index("stash_item_user_created_idx").on(table.userId, table.createdAt)]);
```

Index for the query you actually run — the inbox is "my items, newest first",
which is one composite index.

```
bun run db:generate    # writes src/db/migrations — commit it, it is source
bun run db:migrate     # applies to whatever CLOUDFLARE_D1_DATABASE_ID points at
```

**Never run `db:migrate` without asking**, and confirm which database the env
points at first — `kris-stash-dev` and `kris-stash-prod` are separate, and
pointing dev at prod would write into the real stash. The formatter is told to
leave `src/db/migrations/**` alone; drizzle-kit owns those files.
