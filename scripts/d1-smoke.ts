#!/usr/bin/env bun
/**
 * Round-trips one stash item through real D1 and checks the mappings that fail
 * silently rather than loudly.
 *
 *   bun run scripts/d1-smoke.ts
 *
 * `src/db/client.ts` reads `body.result[0].results.rows` from D1's `/raw`
 * endpoint. If that path is wrong the driver returns an empty array instead of
 * throwing, so every query would look like "no rows" forever. Nothing else in
 * the codebase would notice. Same for the boolean/timestamp/JSON columns: D1
 * stores them as integers and text, and a bad decode surfaces as a wrong value,
 * not an error.
 *
 * Safe to re-run: it creates a throwaway user, then deletes it (the FK cascade
 * takes the stash item with it).
 */

import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import { stashItem } from "@/db/schema/stash";
import { makeStashStore } from "@/stash/store";

const failures: string[] = [];

const describe = (detail: unknown): string =>
  typeof detail === "string" ? detail : JSON.stringify(detail);

const check = (label: string, ok: boolean, detail?: unknown): void => {
  if (ok) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(label);
  console.log(
    `  ✗ ${label}${detail === undefined ? "" : ` — ${describe(detail)}`}`
  );
};

const userId = `smoke_${crypto.randomUUID().replaceAll("-", "")}`;
const store = makeStashStore(db);

console.log(`D1 smoke test against ${process.env.CLOUDFLARE_D1_DATABASE_ID}`);

// 1. A plain SELECT on an empty table. Proves the /raw response path resolves:
//    a wrong mapping and a genuinely empty table look identical here, so this
//    only rules out a throw — the real proof is the read-back below.
const before = await db
  .select()
  .from(stashItem)
  .where(eq(stashItem.userId, userId));
check("SELECT on stash_item returns an array", Array.isArray(before));
check("no rows for an unused user id", before.length === 0, before.length);

// 2. Seed the owner. stash_item.user_id has a FK to user with ON DELETE cascade.
await db.insert(user).values({
  id: userId,
  name: "smoke",
  email: `${userId}@invalid.local`,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const users = await db.select().from(user).where(eq(user.id, userId));
check("inserted user reads back", users.length === 1, users.length);
check(
  "user.emailVerified decodes int 0 as false",
  !users[0]?.emailVerified,
  users[0]?.emailVerified
);
check(
  "user.createdAt decodes as a Date",
  users[0]?.createdAt instanceof Date,
  users[0]?.createdAt
);

try {
  // 3. Write through the real store, which is what the API and MCP both use.
  const created = await Effect.runPromise(
    store.create(userId, {
      body: "smoke test — safe to delete",
      kind: "link",
      source: "cli",
      url: "https://kris.gg",
      tags: ["smoke", "d1"],
    })
  );
  check("store.create returned an id", created.id.length > 0, created.id);

  // 4. Read it back. THIS is the check that catches a bad /raw mapping: the row
  //    was definitely written, so an empty list here means the rows path is
  //    wrong.
  const listed = await Effect.runPromise(store.list(userId));
  check(
    "store.list returns the row just written",
    listed.length === 1,
    listed.length
  );

  const item = listed[0];
  if (item === undefined) {
    throw new Error("nothing came back — the /raw row mapping is wrong");
  }

  check(
    "body survives",
    item.body === "smoke test — safe to delete",
    item.body
  );
  check("kind survives", item.kind === "link", item.kind);
  check("source survives", item.source === "cli", item.source);
  check("url survives", item.url === "https://kris.gg", item.url);
  check("done decodes int 0 as false", !item.done, item.done);
  check(
    "archivedAt decodes NULL as null",
    item.archivedAt === null,
    item.archivedAt
  );
  check(
    "tags decodes JSON text as an array",
    Array.isArray(item.tags) &&
      item.tags.length === 2 &&
      item.tags[0] === "smoke",
    JSON.stringify(item.tags)
  );
  check(
    "createdAt is epoch millis, not seconds",
    item.createdAt > 1_700_000_000_000 && item.createdAt < 4_000_000_000_000,
    item.createdAt
  );

  // 5. Update — one statement, ownership enforced in the WHERE.
  const updated = await Effect.runPromise(
    store.update(userId, item.id, { done: true, tags: ["updated"] })
  );
  check("update flips done to true", updated.done, updated.done);
  check(
    "update rewrites tags",
    updated.tags.length === 1 && updated.tags[0] === "updated",
    JSON.stringify(updated.tags)
  );
  check(
    "updatedAt moved past createdAt",
    updated.updatedAt >= updated.createdAt,
    `${updated.createdAt} -> ${updated.updatedAt}`
  );

  // 6. Ownership: another user must not be able to touch this row.
  const stolen = await Effect.runPromiseExit(
    store.update("someone-else", item.id, { done: false })
  );
  check("another user's update is rejected", stolen._tag === "Failure");

  // 7. Remove.
  await Effect.runPromise(store.remove(userId, item.id));
  const after = await Effect.runPromise(store.list(userId));
  check("remove empties the list", after.length === 0, after.length);

  // 8. The transaction guard must still be armed. drizzle wraps the throw in a
  //    DrizzleQueryError ("Failed query: begin"), so the guard's own message
  //    only shows up on `cause`.
  let guardMessage = "no error thrown";
  try {
    await db.transaction(async (tx) => await tx.select().from(stashItem));
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    guardMessage = cause instanceof Error ? cause.message : String(error);
  }
  check(
    "assertNoTransaction rejects BEGIN",
    guardMessage.includes("does not support transactions"),
    guardMessage
  );
} finally {
  // Cascade takes any stash_item rows with it.
  await db.delete(user).where(and(eq(user.id, userId)));
  const left = await db.select().from(user).where(eq(user.id, userId));
  check("cleanup removed the smoke user", left.length === 0, left.length);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log("\nall checks passed");
