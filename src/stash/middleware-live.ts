import "server-only";

/**
 * `StashAuth` implementation. Server-only — it imports better-auth and, through
 * it, the D1 client. Kept out of `middleware.ts` so the shared API contract can
 * be imported by the browser without dragging any of that into the bundle.
 *
 * Two credential paths, resolved cookie-first:
 *   1. **better-auth session cookie** — the browser at `/stash`.
 *   2. **API key** (`x-api-key`) — Raycast, the CLI, MCP. Passkeys are
 *      interactive by definition and cannot cover those.
 */

import { Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/unstable/http";
import { auth } from "@/lib/auth";
import { CurrentUser, StashAuth } from "./middleware";
import { Unauthorized } from "./schema";

export const StashAuthLayer = Layer.effect(
  StashAuth,
  Effect.gen(function* () {
    return (httpEffect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const headers = new Headers(
          request.headers as unknown as Record<string, string>
        );

        // Branch 1: session cookie. A thrown getSession is treated as "no
        // session" so the API-key branch still gets a chance; only the final
        // fall-through 401s.
        const session = yield* Effect.catch(
          Effect.tryPromise({
            try: () => auth.api.getSession({ headers }),
            catch: () => "getSession-failed" as const,
          }),
          () => Effect.succeed(null)
        );

        if (session?.user?.id) {
          return yield* Effect.provideService(httpEffect, CurrentUser, {
            userId: session.user.id,
          });
        }

        // Branch 2: API key.
        const key = request.headers["x-api-key"];
        if (typeof key === "string" && key !== "") {
          const verified = yield* Effect.catch(
            Effect.tryPromise({
              try: () => auth.api.verifyApiKey({ body: { key } }),
              catch: () => "verify-failed" as const,
            }),
            () => Effect.succeed(null)
          );
          // The api-key plugin stores the owning user in `referenceId`.
          const userId = verified?.key?.referenceId;
          if (verified?.valid === true && typeof userId === "string") {
            return yield* Effect.provideService(httpEffect, CurrentUser, {
              userId,
            });
          }
        }

        return yield* new Unauthorized({
          message: "Sign in with a passkey, or send a valid x-api-key.",
        });
      });
  })
);
