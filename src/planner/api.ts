/**
 * The routes API contract. Imported by BOTH the handler and the browser client,
 * which is what makes the client typed with no codegen — and which is why this
 * module must never reach server-only code.
 *
 * Two groups, deliberately:
 *
 * - `RoutesGroup` carries `StashAuth`, so generating and saving are private.
 *   Generation costs ORS quota and Gemini tokens; it is not open to the world.
 * - `RoutesPublicGroup` carries **no** middleware, because a shared route has to
 *   open for someone who has no passkey. It exposes exactly one read, keyed by
 *   an unguessable `shareId` that is null until sharing is explicitly turned on.
 *
 * Mixing middlewared and un-middlewared groups in one `HttpApi` is supported —
 * middleware attaches per group, not per API.
 */

import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { StashAuth } from "@/stash/middleware";

import {
  GeneratedRoute,
  PlannedRoute,
  RouteInputs,
  RouteNotFound,
  RoutingFailed,
  PlannerStoreError,
} from "./schema";

const IdParam = Schema.Struct({ id: Schema.String });
const ShareParam = Schema.Struct({ shareId: Schema.String });

/** Generate is a POST: it is expensive, not idempotent in cost, and takes a body. */
export const PlanPayload = Schema.Struct({
  inputs: RouteInputs,
  /** Advances the seed set — this is the 🎲 button. */
  seedBase: Schema.optional(Schema.Int),
});

export const SavePayload = Schema.Struct({
  route: GeneratedRoute,
});

export const SharePayload = Schema.Struct({
  shared: Schema.Boolean,
});

export class RoutesGroup extends HttpApiGroup.make("routes")
  .add(
    HttpApiEndpoint.post("plan", "/api/routes/plan", {
      payload: PlanPayload,
      success: GeneratedRoute,
      error: [RoutingFailed],
    })
  )
  .add(
    HttpApiEndpoint.get("list", "/api/routes", {
      success: Schema.Array(PlannedRoute),
      error: [PlannerStoreError],
    })
  )
  .add(
    HttpApiEndpoint.post("save", "/api/routes", {
      payload: SavePayload,
      success: PlannedRoute,
      error: [PlannerStoreError],
    })
  )
  .add(
    HttpApiEndpoint.patch("share", "/api/routes/:id/share", {
      params: IdParam,
      payload: SharePayload,
      success: PlannedRoute,
      error: [RouteNotFound, PlannerStoreError],
    })
  )
  .add(
    HttpApiEndpoint.delete("remove", "/api/routes/:id", {
      params: IdParam,
      success: Schema.Struct({ ok: Schema.Literal(true) }),
      error: [RouteNotFound, PlannerStoreError],
    })
  )
  .middleware(StashAuth) {}

/** No middleware — a share link must work without a session. */
export class RoutesPublicGroup extends HttpApiGroup.make("routesPublic").add(
  HttpApiEndpoint.get("shared", "/api/routes/shared/:shareId", {
    params: ShareParam,
    success: PlannedRoute,
    error: [RouteNotFound, PlannerStoreError],
  })
) {}
