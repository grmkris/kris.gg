/**
 * The Effect seam of the stash client. Ported from the invok donor
 * (`apps/admin-ui/src/lib/api/runtime.ts`).
 *
 * This is the ONLY client module that touches Effect's runtime — everything
 * above it (`src/app/stash/*`) gets plain promises. That keeps Effect out of
 * the component tree and confines the bundle cost to this route.
 *
 * ## Lazy init
 *
 * `getApi()` builds the client on first call and memoizes it, so importing this
 * module never touches the network — or `window` — at module scope. Next still
 * module-evaluates client components on the server, so eager construction here
 * would break the build.
 */

"use client";

import { type Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { StashApi } from "@/stash/api";

/** `credentials: "include"` so the better-auth session cookie rides along. */
const CredentialedFetchLive = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, { credentials: "include" })
);

type UnconstrainedRuntime = ManagedRuntime.ManagedRuntime<never, never>;

let cachedRuntime: UnconstrainedRuntime | undefined;

const getRuntime = (): UnconstrainedRuntime => {
  cachedRuntime ??= ManagedRuntime.make(CredentialedFetchLive);
  return cachedRuntime;
};

export type StashClient = HttpApiClient.ForApi<typeof StashApi>;

let cachedApi: StashClient | undefined;
let cachedApiPromise: Promise<StashClient> | undefined;

/**
 * The real effect additionally requires `HttpApiGroup.MiddlewareClient` for the
 * `StashAuth` middleware. That credential travels as a cookie or `x-api-key`
 * header rather than as client-side plumbing, so it is erased at this single
 * documented seam.
 */
const buildApiEffect = (baseUrl: string): Effect.Effect<StashClient> => {
  const effect = HttpApiClient.make(StashApi, { baseUrl });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return effect as unknown as Effect.Effect<StashClient>;
};

export const getApi = async (): Promise<StashClient> => {
  if (cachedApi !== undefined) {
    return cachedApi;
  }
  if (cachedApiPromise === undefined) {
    const baseUrl =
      typeof window === "undefined" ? "http://localhost:3001" : window.location.origin;
    cachedApiPromise = getRuntime().runPromise(buildApiEffect(baseUrl));
  }
  cachedApi = await cachedApiPromise;
  return cachedApi;
};

/** Run a client effect and resolve with a plain promise. */
export const runApi = async <A, E>(
  effect: Effect.Effect<A, E>
): Promise<A> => await getRuntime().runPromise(effect);
