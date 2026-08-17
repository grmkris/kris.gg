#!/usr/bin/env bun
/**
 * Mint an API key for the machine capture surfaces (CLI, Raycast, MCP).
 *
 *   bun run scripts/stash-key.ts "raycast"
 *
 * There is no minting UI: the browser signs in with a passkey and never needs a
 * key, and everything that does need one is headless. This runs server-side
 * against whatever database `.env` points at, so it skips the session
 * requirement `auth.api.createApiKey` would otherwise impose.
 *
 * The key is shown ONCE — better-auth stores it hashed.
 */

import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";

const name = process.argv[2] ?? "cli";

const owner = (await db.select().from(user).limit(1))[0];
if (owner === undefined) {
  console.error(
    "No user exists yet. Register a passkey at /stash first — that creates the account."
  );
  process.exit(1);
}

const key = await auth.api.createApiKey({
  body: {
    name,
    // Rate limiting is per-key state, written at creation — so a key minted
    // before the plugin default was turned off keeps its 10-requests-per-day
    // cap. Set it explicitly rather than relying on the plugin config.
    rateLimitEnabled: false,
    // The api-key plugin stores the owner in `referenceId`, not `userId`.
    userId: owner.id,
  },
});

console.log(`\n  ${name} → ${owner.name} (${owner.id})\n`);
console.log(`  export STASH_API_KEY=${key.key}\n`);
console.log("  Shown once. better-auth stores only a hash.\n");
