import "server-only";
/**
 * The stash as an MCP server, so Claude Code (and any MCP client that can reach
 * the site) can capture and read without a browser. This is the capability
 * Copper structurally cannot have — an inbox agents can write to.
 *
 * Mounted into the SAME `HttpRouter` as the stash HttpApi, so one Next catch-all
 * route serves both.
 *
 * ## Identity
 *
 * MCP tool handlers are required to have `R = never`, so the per-request user
 * cannot be an ordinary service. `StashOwner` is a `Context.Reference` (it
 * carries a default, so it stays out of `R`) which `McpAuthMiddleware` fills in
 * from the `x-api-key` header. A request without a valid key leaves it empty and
 * every tool refuses — passkeys are interactive and cannot cover a headless
 * client, so the API key is the only credential here.
 */
import { Context, Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpRouter, HttpServerRequest } from "effect/unstable/http";
import type { HttpServerResponse } from "effect/unstable/http";

import { auth } from "@/lib/auth";

import { StashKind, StashSource } from "./schema";
import { StashStore } from "./store";

/** Empty string = "this request presented no valid API key". */
export const StashOwner = Context.Reference<string>("kris-gg/StashOwner", {
  defaultValue: () => "",
});

const requireOwner = Effect.gen(function* requireOwner() {
  const userId = yield* StashOwner;
  if (userId === "") {
    return yield* Effect.die(
      new Error("Unauthorized: send a valid x-api-key header.")
    );
  }
  return userId;
});

const StashAdd = Tool.make("stash_add", {
  description:
    "Save a fragment to Kristjan's private stash inbox for later triage.",
  parameters: Schema.Struct({
    body: Schema.NonEmptyString,
    kind: Schema.optional(StashKind),
    tags: Schema.optional(Schema.Array(Schema.String)),
    url: Schema.optional(Schema.String),
  }),
  success: Schema.Struct({ id: Schema.String }),
});

const StashList = Tool.make("stash_list", {
  description:
    "List items in the stash inbox, newest first. Check this before adding, to avoid duplicates.",
  parameters: Schema.Struct({ includeDone: Schema.optional(Schema.Boolean) }),
  success: Schema.Array(
    Schema.Struct({
      body: Schema.String,
      createdAt: Schema.Number,
      done: Schema.Boolean,
      id: Schema.String,
      source: StashSource,
    })
  ),
});

const StashDone = Tool.make("stash_done", {
  description: "Mark a stash item as done, by id.",
  parameters: Schema.Struct({ id: Schema.String }),
  success: Schema.Struct({ ok: Schema.Boolean }),
});

export const StashToolkit = Toolkit.make(StashAdd, StashList, StashDone);

const StashToolkitLayer = StashToolkit.toLayer(
  Effect.gen(function* StashToolkitLayer() {
    const store = yield* StashStore;

    return {
      stash_add: Effect.fn("mcp.stash_add")(function* (params) {
        const userId = yield* requireOwner;
        const item = yield* Effect.orDie(
          store.create(userId, {
            body: params.body,
            kind: params.kind ?? "note",
            source: "mcp",
            ...(params.url === undefined ? {} : { url: params.url }),
            ...(params.tags === undefined ? {} : { tags: params.tags }),
          })
        );
        return { id: item.id as string };
      }),

      stash_done: Effect.fn("mcp.stash_done")(function* (params) {
        const userId = yield* requireOwner;
        yield* Effect.orDie(
          store.update(userId, params.id as never, { done: true })
        );
        return { ok: true };
      }),

      stash_list: Effect.fn("mcp.stash_list")(function* (params) {
        const userId = yield* requireOwner;
        const items = yield* Effect.orDie(store.list(userId));
        return items
          .filter((i) => params.includeDone === true || !i.done)
          .map((i) => ({
            id: i.id as string,
            body: i.body,
            done: i.done,
            source: i.source,
            createdAt: i.createdAt,
          }));
      }),
    };
  })
);

/**
 * Resolves `x-api-key` into `StashOwner`. Registered globally on this router;
 * the stash HttpApi is unaffected because it takes identity from `StashAuth`.
 */
const McpAuthMiddleware = HttpRouter.middleware(
  (httpEffect: Effect.Effect<HttpServerResponse.HttpServerResponse, unknown>) =>
    Effect.gen(function* McpAuthMiddleware() {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const key = request.headers["x-api-key"];
      if (typeof key !== "string" || key === "") {
        return yield* httpEffect;
      }
      const verified = yield* Effect.catch(
        Effect.tryPromise({
          catch: () => "verify-failed" as const,
          try: async () => auth.api.verifyApiKey({ body: { key } }),
        }),
        () => Effect.succeed(null)
      );
      const userId = verified?.key?.referenceId;
      if (verified?.valid === true && typeof userId === "string") {
        return yield* Effect.provideService(httpEffect, StashOwner, userId);
      }
      return yield* httpEffect;
    }),
  { global: true }
);

export const StashMcpLayer = McpServer.layerHttp({
  name: "kris-stash",
  path: "/api/mcp",
  version: "0.1.0",
}).pipe(
  Layer.provide(McpServer.toolkit(StashToolkit)),
  Layer.provide(StashToolkitLayer),
  Layer.provideMerge(McpAuthMiddleware)
);
