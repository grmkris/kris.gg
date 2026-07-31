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
 * cannot be an ordinary service. This used to be a `Context.Reference` filled
 * by a global router middleware; `requireOwner` now reads the request straight
 * off the current fiber's context instead — the same way Effect's own MCP HTTP
 * transport reaches it — which also keeps `R` at `never`, with no dependency on
 * middleware ordering or on how far the request context survives into the
 * server's forked run loop. Verified: at tool-handler depth the fiber does
 * carry `HttpServerRequest`, `x-api-key` and all.
 *
 * (The middleware version may well have worked too. It appeared broken while
 * the api-key plugin's default 10-requests-per-DAY limit was quietly failing
 * every verification — see the rate limit note in `src/lib/auth.ts`.)
 *
 * No valid `x-api-key`, no tool call: passkeys are interactive and cannot cover
 * a headless client, so the API key is the only credential here.
 */
import { Context, Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { HttpServerRequest } from "effect/unstable/http";

import { auth } from "@/lib/auth";

import { StashKind, StashSource } from "./schema";
import { StashStore } from "./store";

const unauthorized = Effect.die(
  new Error("Unauthorized: send a valid x-api-key header.")
);

/** Empty string = "this request presented no API key at all". */
const currentApiKey = Effect.withFiber<string>((fiber) => {
  const request = Context.getOrUndefined(
    fiber.context,
    HttpServerRequest.HttpServerRequest
  );
  const key = request?.headers["x-api-key"];
  return Effect.succeed(typeof key === "string" ? key : "");
});

const requireOwner = Effect.gen(function* requireOwner() {
  const key = yield* currentApiKey;
  if (key === "") {
    return yield* unauthorized;
  }
  const verified = yield* Effect.catch(
    Effect.tryPromise({
      catch: () => "verify-failed" as const,
      try: async () => auth.api.verifyApiKey({ body: { key } }),
    }),
    () => Effect.succeed(null)
  );
  // The api-key plugin stores the owning user in `referenceId`, not `userId`.
  const userId = verified?.key?.referenceId;
  if (verified?.valid !== true || typeof userId !== "string") {
    return yield* unauthorized;
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

export const StashMcpLayer = McpServer.layerHttp({
  name: "kris-stash",
  path: "/api/mcp",
  version: "0.1.0",
}).pipe(
  Layer.provide(McpServer.toolkit(StashToolkit)),
  Layer.provide(StashToolkitLayer)
);
