---
name: backend-patterns
description: Server-side patterns for kris.gg — Effect HttpApi groups, handlers, layer wiring in the single catch-all route, the browser-safe vs server-only split, and MCP tool identity. Use when adding or changing an API endpoint, a service, or anything under src/stash, src/planner or src/app/api.
globs:
  - src/stash/**/*.ts
  - src/planner/**/*.ts
  - src/lib/api/**/*.ts
  - src/app/api/**/*.ts
alwaysApply: false
---

# Backend Patterns

kris.gg is a **static content site with two dynamic islands**: `/stash` (private
capture inbox) and `/routes` (route planner). Both are served by **one** Effect
`HttpRouter` mounted at a single Next catch-all route. There is no ORPC, no
`src/server/`, and no `src/test/` — if you find guidance referring to those, it
predates the rewrite.

## The four layers of an endpoint

Adding an endpoint means touching these, in order:

| Layer | File | Rule |
| --- | --- | --- |
| **Contract** | `src/stash/api.ts` (`HttpApiGroup`) | **Imported by the browser.** Must never reach server-only code. |
| **Root** | `src/lib/api/contract.ts` | One `HttpApi.make("kris-gg")` composing every group. Also browser-imported. |
| **Handler** | `src/stash/handlers.ts` (`HttpApiBuilder.group`) | Thin. Pull identity from `CurrentUser`, delegate to the store. |
| **Wiring** | `src/app/api/[[...path]]/route.ts` | Layer built **once at module scope**, so a warm serverless instance reuses it. |

```ts
// contract — src/stash/api.ts
export class StashGroup extends HttpApiGroup.make("stash")
  .add(
    HttpApiEndpoint.get("list", "/api/stash", {
      success: Schema.Array(StashItem),
      error: [StashStoreError],
    })
  )
  .middleware(StashAuth) {}
```

```ts
// handler — src/stash/handlers.ts
export const StashGroupLayer = HttpApiBuilder.group(KrisApi, "stash", (handlers) =>
  Effect.gen(function* () {
    const store = yield* StashStore;
    return handlers.handle("list", () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser;   // from StashAuth
        return yield* store.list(userId);
      })
    );
  })
);
```

**Errors are passed as an ARRAY** (`error: [NotFound, StoreError]`), not wrapped
in a `Schema.Union`. A union loses each class's `httpApiStatus` annotation and
every failure degrades to 500.

## Bundle discipline — the rule most likely to bite

`src/stash/api.ts` and `src/lib/api/contract.ts` are imported by the **browser**.
Anything they touch ships to the client. That is why `StashAuth` is split:

- `src/stash/middleware.ts` — the *declaration* (`HttpApiMiddleware.Service`),
  browser-safe.
- `src/stash/middleware-live.ts` — the implementation, marked `import "server-only"`,
  imported only by the route handler.

Any module that reaches better-auth, drizzle, or a secret gets `import "server-only"`
at the top. Verify after a build:

```bash
bun run build
grep -rl "drizzle-orm\|api.cloudflare.com" .next/static/chunks/   # must be empty
```

Effect chunks may appear on `/stash` and `/routes` only — never on a content page.

## Auth

`StashAuth` resolves, in order: better-auth **session cookie**, then
**`x-api-key`**. Both produce `CurrentUser`. A thrown `getSession` is swallowed so
the API-key branch still gets a chance; only the final fall-through 401s.

Passkeys are interactive and cannot cover the CLI, Raycast or MCP — that is why
the API-key path exists, not as a convenience.

## MCP tool identity — `R = never`

`McpServer` forks its run loop when the layer is built (`Effect.forkScoped`), and
tool handlers are required to have `R = never`. So per-request identity cannot be
an ordinary service, and a router middleware cannot reliably supply one either.

`src/stash/mcp.ts` reads the request off the **current fiber's context** — the
same way Effect's own MCP HTTP transport does — which keeps `R` at `never`:

```ts
const currentApiKey = Effect.withFiber<string>((fiber) => {
  const request = Context.getOrUndefined(fiber.context, HttpServerRequest.HttpServerRequest);
  const key = request?.headers["x-api-key"];
  return Effect.succeed(typeof key === "string" ? key : "");
});
```

## Effect v4 API drift

The repo pins `effect@4.0.0-beta.x` **exactly**. The published effect-ts guidance
is often written for a different beta. Verified for this version:

- `Context.Service`, **not** `ServiceMap.Service`
- `HttpApiEndpoint.delete`, **not** `del`
- `Schema.NonEmptyString`, **no** `Schema.minLength`
- `Schema.Literals([...])` for enums

When in doubt, read `node_modules/effect/dist/**` — the installed source is the
only authority.

## Related

- Storage rules and the no-transactions constraint: `drizzle-patterns`
- Client consumption of these endpoints: `frontend-patterns`
