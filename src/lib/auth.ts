/**
 * Auth for the private `/stash` inbox. Single user — me.
 *
 * Two credential paths, because they solve different problems:
 *   - **passkey** for the browser (Face ID on the phone, nothing to leak).
 *   - **API key** for machines. Passkeys are interactive by definition and
 *     cannot authenticate Raycast, the CLI, or the MCP endpoint.
 */

import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

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

export const auth = betterAuth({
  baseURL: siteUrl(),
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // Passkey-only: there is no password to store and no email to verify.
  emailAndPassword: { enabled: false },
  plugins: [
    passkey({
      origin: trustedOrigins,
      rpID: rpID(),
      rpName: "kris.gg",
    }),
    apiKey(),
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
