/**
 * Auth for the private `/stash` inbox. Single user — me.
 *
 * Two credential paths, because they solve different problems:
 *   - **passkey** for the browser (Face ID on the phone, nothing to leak).
 *   - **API key** for machines. Passkeys are interactive by definition and
 *     cannot authenticate Raycast, the CLI, or the MCP endpoint.
 */

import { timingSafeEqual } from "node:crypto";

import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { user } from "@/db/schema/auth";

import { siteUrl } from "./site";

/**
 * A passkey's rpID may drop labels from the left of the effective domain, so a
 * single `kris.gg` relying party covers `dev.kris.gg` too — one registered
 * passkey works in both environments. Locally it must be `localhost`.
 */
const rpID = (): string => {
  const url = new URL(siteUrl());
  return url.hostname === "localhost" ? "localhost" : "kris.gg";
};

const trustedOrigins = [
  "https://kris.gg",
  "https://dev.kris.gg",
  "http://localhost:3001",
];

/** The one account. Nothing ever emails it; better-auth just requires a value. */
const OWNER = { email: "kris@kris.gg", name: "kris" } as const;

const secretsMatch = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Registration gate. The passkey plugin will not create a user on its own, and
 * `addPasskey` normally needs a session — which, with no password and no social
 * provider, nothing could ever produce. So registration runs session-less and
 * this decides who the passkey belongs to.
 *
 * Two rules:
 *
 *  1. **`STASH_REGISTRATION_SECRET` must match.** Unset the variable and
 *     registration is closed entirely; rotate it and every previously-issued
 *     value dies. Note the secret arrives as the `context` *query parameter* —
 *     the plugin resolves the user during `generate-register-options`, and its
 *     client forwards custom headers only to `verify-registration`. It will
 *     therefore appear in access logs, which is why rotating it is the intended
 *     lifecycle rather than an emergency measure.
 *
 *  2. **At most one user, ever.** If an account exists, the new passkey binds
 *     to it instead of creating a second. That is the single-user gate, and it
 *     is also what makes registering a second device — or the same device
 *     against the other rpID, since `localhost` and `kris.gg` passkeys are
 *     different credentials over the same database — an ordinary operation.
 */
const resolveOwner = async (context: string | null | undefined) => {
  const expected = process.env.STASH_REGISTRATION_SECRET ?? "";
  if (
    expected === "" ||
    typeof context !== "string" ||
    !secretsMatch(context, expected)
  ) {
    throw new APIError("UNAUTHORIZED", {
      message: "Passkey registration is closed.",
    });
  }

  const existing = await db.select().from(user).limit(1);
  const owner = existing[0];
  if (owner !== undefined) {
    return { displayName: owner.name, id: owner.id, name: owner.name };
  }

  // One statement: D1 has no usable transactions (see src/db/client.ts).
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(user).values({
    createdAt: now,
    email: OWNER.email,
    emailVerified: true,
    id,
    name: OWNER.name,
    updatedAt: now,
  });
  return { displayName: OWNER.name, id, name: OWNER.name };
};

export const auth = betterAuth({
  baseURL: siteUrl(),
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // Passkey-only: there is no password to store and no email to verify.
  emailAndPassword: { enabled: false },
  plugins: [
    passkey({
      origin: trustedOrigins,
      registration: {
        requireSession: false,
        resolveUser: async ({ context }) => resolveOwner(context),
      },
      rpID: rpID(),
      rpName: "kris.gg",
    }),
    apiKey({
      /**
       * The plugin defaults to 10 requests per key per DAY, which a single
       * `bun run stash --list` plus one MCP session exhausts — after which the
       * key silently reads as invalid and every surface returns 401. There is
       * one user and the keys are personal, so rate limiting buys nothing here.
       */
      rateLimit: { enabled: false },
    }),
  ],
  session: {
    /**
     * Load-bearing, not an optimisation. Every DB read is a Vercel → Cloudflare
     * HTTPS round-trip (see `src/db/client.ts`); without this cache each request
     * would pay one just to validate the session cookie.
     */
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
