# kris.gg

My personal site. A **prerendered Next.js (App Router) site on Vercel** — the
public half (journal / trips / building / notes) is fully static, built from
`src/content/*` plus photos served from Cloudflare R2.

Two dynamic islands sit behind it, both private:

- **`/stash`** — a personal capture inbox. Passkey in the browser, API keys for
  the CLI, a Raycast hotkey and an MCP endpoint agents can write to.
- **`/routes`** — a running-route planner (OpenRouteService + Overpass + a
  two-call AI pass).

Both are served by one Effect `HttpRouter` mounted at a single Next catch-all
route, backed by **Cloudflare D1 over its HTTP API**.

## Getting started

```bash
bun install
bun run dev            # http://localhost:3001
```

`/stash` and `/routes` need environment variables — see `.env.example`. The
public content pages render without any of them.

## Stack

|             |                                                                    |
| ----------- | ------------------------------------------------------------------ |
| Framework   | Next.js 16 (App Router), React 19, Tailwind v4                     |
| Dynamic API | Effect v4 `HttpApi` (pinned exact — currently `4.0.0-beta.101`)    |
| Database    | Cloudflare D1 via its HTTP API, Drizzle over `sqlite-proxy`        |
| Auth        | better-auth — passkey (browser) + API key (CLI, Raycast, MCP)      |
| Media       | Cloudflare R2 — photos on `i.kris.gg`, private bucket for `/stash` |
| Runtime     | Bun                                                                |

## Scripts

```bash
bun run dev            # dev server on :3001
bun run build          # production build
bun run verify         # typecheck + lint/format check + tests (non-mutating)
bun run typecheck      # tsgo --noEmit
bun run fix            # lint + format
bun run test           # bun test

bun run db:generate    # generate a migration (ask first)
bun run db:migrate     # apply migrations (never automatic)

bun run smoke:d1       # round-trip a real item through D1
bun run smoke:r2       # presigned upload / read / delete
bun run stash "…"      # capture from the CLI
```

### Photo pipeline

Galleries are built locally from Apple Photos and uploaded to R2 — the Vercel
build does zero image work, and `public/photos/` stays out of git.

```bash
bun run photos:mine <slug> --from YYYY-MM-DD --to YYYY-MM-DD
bun run photos:itinerary <pool> [--partition]   # GPS clustering → per-leg dirs
bun run photos:curate <slug>                    # Gemini classify + rank
bun run photos:review [slug]                    # local dashboard: pick + order
bun run photos:place <slug> [--download]        # commit winners to public/photos
bun run photos:meta                             # captions/tags → committed JSON
bun run photos:publish                          # encode webp + upload to R2
```

## Environments

`dev` auto-deploys to `dev.kris.gg`; `main` to `kris.gg`. Work on `dev`, then
promote with a reviewed **merge-commit** PR (never squash). `main` is never
pushed directly.
