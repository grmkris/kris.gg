/**
 * The stash API, served by Effect's HttpRouter through a Next route handler.
 *
 * `HttpRouter.toWebHandler` returns a plain `(Request) => Promise<Response>`,
 * which is exactly a Next route handler. The layer is built ONCE at module
 * scope so the serverless instance reuses it across requests rather than
 * reconstructing the router per call.
 *
 * `/api/auth/[...all]` is a more specific segment and keeps winning over this
 * optional catch-all, so better-auth's routes are unaffected.
 */

import { NodeServices } from "@effect/platform-node";
import { Layer } from "effect";
import { Etag, HttpPlatform, HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { StashApi } from "@/stash/api";
import { StashGroupLayer } from "@/stash/handlers";
import { StashMcpLayer } from "@/stash/mcp";
import { StashAuthLayer } from "@/stash/middleware-live";
import { StashStoreLayer } from "@/stash/store";

const ApiLive = Layer.mergeAll(
  HttpApiBuilder.layer(StashApi),
  // Same router: /api/stash/* and /api/mcp are served by one handler.
  StashMcpLayer
).pipe(
  Layer.provide(StashGroupLayer),
  Layer.provide(StashAuthLayer),
  Layer.provide(StashStoreLayer),
  // HttpPlatform only backs file responses, which this API never returns, but
  // HttpApiBuilder requires the service regardless. NodeServices supplies the
  // FileSystem/Path it depends on — fine here because Next route handlers run
  // on the Node runtime, not edge.
  Layer.provide(HttpPlatform.layer),
  Layer.provide(Etag.layerWeak),
  Layer.provide(NodeServices.layer)
);

const { handler } = HttpRouter.toWebHandler(ApiLive);

// `handler` takes an optional Effect `Context` as its second parameter, which
// collides with the `{ params }` context Next passes to route handlers. Narrow
// it to request-only so the generated route types are satisfied.
const handle = (request: Request): Promise<Response> => handler(request);

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
