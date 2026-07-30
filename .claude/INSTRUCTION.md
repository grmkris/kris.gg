# Instruction: Bring /stash online against real Cloudflare D1

## Objective

The `/stash` private capture inbox is fully written and committed (`b415f50` on
`dev`) but has **never touched a real database**. Provision D1, run migrations,
mint a passkey + API key, and verify every surface end-to-end.

## Context — what /stash is

A personal "I'll need this later" inbox, inspired by
[Copper](https://shadcn.com/copper). Single user (me), private, **not** published
content and **not** wired into `src/content/*`.

The design constraint that drives everything: a web page cannot read the OS text
selection or bind a global hotkey — that needs a native app with a macOS
Accessibility grant. So `/stash` is the **triage UI**, and **capture happens
elsewhere**: CLI, Raycast, and an MCP endpoint that agents can write to. The
agent-writable inbox is the part Copper structurally cannot do.

## Current state

Committed on `dev` as `b415f50`. `bun run typecheck` clean, `bun test` 15/15
green, `bun run build` succeeds.

### Architecture

```
kris.gg (Vercel, Node runtime)
├── /stash                        client UI, passkey sign-in, keyboard layer
├── /api/auth/[...all]            better-auth handler
└── /api/[[...path]]              ONE Effect HttpRouter serving:
      ├── /api/stash  (HttpApi)   list / create / update / remove
      └── /api/mcp    (McpServer) stash_add / stash_list / stash_done
                    │
                    └── drizzle-orm/sqlite-proxy ──HTTP──> Cloudflare D1
```

### Files

| Path | Role |
| --- | --- |
| `src/db/client.ts` | D1 over REST; `assertNoTransaction` guard |
| `src/db/schema/{stash,auth,index}.ts` | `stash_item` + better-auth tables (CLI-generated) |
| `src/stash/schema.ts` | `StashItem`, payloads, tagged errors |
| `src/stash/api.ts` | `StashApi` contract — **imported by the browser too** |
| `src/stash/store.ts` | `StashStore` service + layer |
| `src/stash/handlers.ts` | `StashGroup` implementation |
| `src/stash/middleware.ts` | `StashAuth` **declaration only** (browser-safe) |
| `src/stash/middleware-live.ts` | `StashAuth` implementation (`server-only`) |
| `src/stash/mcp.ts` | MCP toolkit + `StashOwner` reference + key middleware |
| `src/lib/auth.ts` | better-auth (passkey + apiKey, cookieCache) |
| `src/lib/api/runtime.ts` | lazy `ManagedRuntime` + `HttpApiClient` (invok donor port) |
| `src/app/stash/*` | page, promise-shaped client, UI |
| `scripts/stash.ts`, `scripts/raycast/stash-clipboard.sh` | capture surfaces |

### Dependencies added (exact pins matter)

```
effect                4.0.0-beta.101   (exact)
@effect/platform-node 4.0.0-beta.101   (exact)
better-auth           ^1.6.25
@better-auth/passkey  1.6.25           (separate package in 1.6.x)
@better-auth/api-key  1.6.25           (separate package in 1.6.x)
drizzle-orm           ^0.45.2
drizzle-kit           ^0.31.10
server-only           ^0.0.1
```

## Hard-won facts — do not re-derive, do not "fix" these

Verified against installed source, not docs:

1. **There is no runtime `d1-http` Drizzle driver.** `drizzle-orm/d1` needs a
   Workers binding. `driver: "d1-http"` in `drizzle.config.ts` is drizzle-kit
   (migrations) only. Runtime goes through `drizzle-orm/sqlite-proxy`.
2. **D1 has no usable transactions, either driver.** Both emit literal
   `BEGIN`/`COMMIT`, which D1 rejects — and over stateless REST they'd hit
   different connections anyway. `assertNoTransaction` fails loudly on purpose.
   **Every mutation must stay a single statement.** Ownership is enforced by
   putting `userId` in the `WHERE`, never by read-then-write.
3. **D1's `/raw` returns `result[0].results.rows`** (positional arrays), not
   `result[0].results`. `/query` would return row *objects* and force fragile
   key-order reconstruction — that's why `/raw` is used.
4. **Effect beta.101 has `Context.Service`, NOT `ServiceMap.Service`.** The
   installed effect-ts skill is wrong for this version. Same class of drift:
   `HttpApiEndpoint.delete` (not `del`), `Schema.NonEmptyString` (no
   `Schema.minLength`). **Prefer `~/Code/github-com/invok` real beta code over
   the skill** for API shapes.
5. **better-auth 1.6.25 does not bundle passkey/api-key** — separate
   `@better-auth/*` packages. The API key's owner column is **`referenceId`**,
   not `userId`.
6. **Bundle discipline is load-bearing.** `src/stash/api.ts` is imported by the
   browser. It must never reach server-only code — that's why the `StashAuth`
   declaration and its implementation are in separate files. Regression check:
   after a build, `drizzle-orm` and `api.cloudflare.com` must not appear in
   `.next/static/chunks/`, and only `/stash` should reference the Effect chunk.
7. **MCP tool handlers require `R = never`**, so per-request identity cannot be
   an ordinary service. `StashOwner` is a `Context.Reference` (has a default →
   stays out of `R`), filled from `x-api-key` by a global router middleware.
   Empty string means "no valid key" and every tool refuses.
8. **Passkey `rpID: "kris.gg"` covers `dev.kris.gg`** (labels drop from the
   left), so one passkey works in both. Locally it must be `localhost`.

## Requirements

### 1. Provision D1 (needs Cloudflare access — the blocker)

- Create **two** databases: `kris-stash-dev` and `kris-stash-prod`. Never share
  one; pointing `dev.kris.gg` at prod would write into the real stash.
- Create an API token with **D1 Edit**.
- Fill `.env` locally (see `.env.example`) and set per-environment on Vercel:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_D1_DATABASE_ID` (dev id for Preview, prod id for Production)
  - `CLOUDFLARE_D1_TOKEN`
  - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)

### 2. Migrate

```
bun run db:generate     # writes src/db/migrations
bun run db:migrate      # applies to whichever DB the env points at
```

Ask before running either, per house rules.

### 3. Verify the D1 read path first

This is the least-trusted code in the change — the `/raw` row mapping has never
seen a real response. A wrong mapping returns empty rows silently rather than
erroring, so check an actual SELECT before trusting anything downstream.

### 4. Sign in and exercise the UI

`bun run dev` (port 3001) → `/stash` → register a passkey (rpID `localhost`) →
capture, toggle done, delete. Keyboard: `/` focus, `⌘↵` save, `j`/`k` move, `x`
toggle, `e` delete.

### 5. Machine surfaces

Mint an API key via better-auth, export `STASH_API_KEY`, then:

```
bun run stash "hello from the cli"
bun run stash --list
curl -H "x-api-key: $STASH_API_KEY" https://dev.kris.gg/api/stash   # 200
curl https://dev.kris.gg/api/stash                                  # 401
claude mcp add --transport http stash https://dev.kris.gg/api/mcp --header "x-api-key: $STASH_API_KEY"
```

Then have Claude call `stash_add` and confirm the row appears in the UI.

## Acceptance Criteria

- [ ] Two D1 databases exist; env vars set locally and per Vercel environment
- [ ] `bun run db:migrate` applied to the dev database
- [ ] A real `SELECT` returns correctly-shaped rows (validates the `/raw` mapping)
- [ ] Passkey registration + sign-in works locally
- [ ] Capture / toggle / delete work against real D1
- [ ] `bun run stash "…"` and `--list` work with an API key
- [ ] `/api/stash` returns 401 without a credential, 200 with one
- [ ] MCP: `stash_add` from Claude Code creates a visible row
- [ ] Deployed to `dev.kris.gg`; passkey + capture retested **on the phone**
      (mobile is where passkey config problems surface)
- [ ] Public site unaffected: content routes still prerender, `/stash` is
      `noindex` and absent from `sitemap.xml`
- [ ] Only `/stash` loads the Effect chunk (see fact #6)
- [ ] `bun run typecheck` and `bun test` pass
- [ ] Promote with a `dev`→`main` **merge-commit** PR (never squash)

## Known issues NOT caused by this work

- **`bun run fix` is broken repo-wide.** `.oxlintrc.json` extends
  `node_modules/ultracite/config/oxlint/{core,next}/.oxlintrc.json`, which
  ultracite 7.8.3 no longer ships. Pre-existing (lockfile untouched for
  ultracite/oxlint). It means **`bun run verify` cannot pass today** — use
  `bun run typecheck && bun test` until it's fixed.
- **`src/components/ui/sonner.tsx` is missing `"use client"`.** Latent — nothing
  rendered `<Toaster/>` before. Worked around by mounting it from a client
  component instead of editing the shared file.
- Stale docs still describing the deleted ORPC stack: `README.md` (unmodified
  Better-T-Stack template) and `.claude/skills/{backend,drizzle,frontend,testing}-patterns`.
  Also orphaned: `local.db`, `apps/kris.gg/`. Left in place deliberately —
  deletion is irreversible and was not confirmed.

## Deferred / not built

- Browser extension (MV3 context-menu capture)
- OAuth for claude.ai custom connectors — would need better-auth's **OAuth
  Provider** plugin, not its `mcp` plugin (that one is slated for deprecation).
  Bearer/API key is sufficient for Claude Code.
- FTS5 search
- A single-user gate on sign-up (currently any passkey registration creates a
  user — **close this before `main`**)

## Escape hatch

If `/stash` feels sluggish, the cause is that every query is one
Vercel → Cloudflare round-trip. `session.cookieCache` already keeps auth off that
path. The real fix is moving the API to a Worker at `api.kris.gg` with a native
D1 binding: the Effect/HttpApi code ports unchanged, only the host and
cookie/CORS config move (`crossSubDomainCookies` + `trustedOrigins`).
