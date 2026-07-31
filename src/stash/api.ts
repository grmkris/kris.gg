/**
 * The `StashGroup` contract. Imported by BOTH the route handler and the browser
 * client — that shared import is what makes the client fully typed with no
 * codegen step.
 *
 * The `HttpApi` that composes this group lives in `src/lib/api/contract.ts`.
 */

import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { StashAuth } from "./middleware";
import {
  CreateStashItem,
  StashItem,
  StashItemNotFound,
  StashStoreError,
  UpdateStashItem,
} from "./schema";

const IdParam = Schema.Struct({ id: Schema.String });

export class StashGroup extends HttpApiGroup.make("stash")
  .add(
    HttpApiEndpoint.get("list", "/api/stash", {
      success: Schema.Array(StashItem),
      error: [StashStoreError],
    })
  )
  .add(
    HttpApiEndpoint.post("create", "/api/stash", {
      payload: CreateStashItem,
      success: StashItem,
      error: [StashStoreError],
    })
  )
  .add(
    HttpApiEndpoint.patch("update", "/api/stash/:id", {
      params: IdParam,
      payload: UpdateStashItem,
      success: StashItem,
      error: [StashItemNotFound, StashStoreError],
    })
  )
  .add(
    HttpApiEndpoint.delete("remove", "/api/stash/:id", {
      params: IdParam,
      success: Schema.Struct({ ok: Schema.Literal(true) }),
      error: [StashItemNotFound, StashStoreError],
    })
  )
  .middleware(StashAuth) {}

// The `HttpApi` root now lives in `src/lib/api/contract.ts` — it composes this
// group alongside the planner's, and keeping it here would have forced
// `src/stash` to import `src/planner`.
