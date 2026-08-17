# kris.gg — Autonomous Operation

Personal site: **prerendered Next.js (App Router) on Vercel**. The public site
(trips/journal/building/notes) is a content site built from `src/content/*` +
photos and stays fully static.

The ORPC scaffolding from the original template is gone — there is no
`src/server/` and no `src/test/`. Everything dynamic runs through one Effect
`HttpRouter`. Drizzle and better-auth are back, but only for `/stash` and
`/routes`.

## /stash — private capture inbox

A personal, single-user tool at `/stash`; not published content and not part of
`src/content/*`. It is the only stateful part of the site.

- **Storage:** Cloudflare D1 over its **HTTP API** (`src/db/client.ts`). There is
  no runtime `d1-http` Drizzle driver — queries go through
  `drizzle-orm/sqlite-proxy`; `driver: "d1-http"` in `drizzle.config.ts` is
  drizzle-kit/migrations only.
- **D1 has no usable transactions.** Both drizzle drivers emit literal
  `BEGIN`/`COMMIT`, which D1 rejects. `assertNoTransaction` fails loudly instead
  of allowing partial writes — **keep every mutation a single statement**.
- **Latency:** every query is one Vercel → Cloudflare round-trip. better-auth's
  `session.cookieCache` is load-bearing, not an optimisation.
- **Auth:** better-auth with **passkey** (browser) + **API key** (Raycast, CLI,
  MCP). Passkeys are interactive and cannot authenticate headless clients.
  `rpID: "kris.gg"` covers `dev.kris.gg` too.
- **Effect v4** (pinned exact, currently `4.0.0-beta.101`). Note this version has
  `Context.Service`, **not** `ServiceMap.Service` as the effect-ts skill claims;
  prefer the invok repo's real beta code over the skill for API shapes.
- **Bundle discipline:** `src/stash/api.ts` is imported by the browser, so it
  must never reach server-only code. Auth's implementation lives in
  `middleware-live.ts` (marked `server-only`), separate from the `middleware.ts`
  declaration. Verify with a build that only `/stash` loads the Effect chunk.
- **Capture surfaces:** `scripts/stash.ts` (CLI), `scripts/raycast/` (hotkey),
  `/api/mcp` (MCP). A web page cannot read the OS selection or bind a global
  hotkey — that needs a native app — so capture lives outside the browser.

## Environments (Vercel dev-flow)

Two long-lived branches, both auto-deploying via Vercel:

- **`dev`** → preview at **`dev.kris.gg`** (Vercel preview build). Work here.
- **`main`** → production at **`kris.gg`**.

Commit to `dev`, test on `dev.kris.gg`, then promote with a reviewed `dev`→`main`
**merge-commit** PR (never squash — keeps `dev` an ancestor of `main`). Never push
`main` directly.

The only env-sensitive value is the canonical origin (`src/lib/site.ts` →
`siteUrl()`/`isProd`), driven by `NEXT_PUBLIC_SITE_URL`, set per Vercel env
(Production = `https://kris.gg`, dev-branch Preview = `https://dev.kris.gg`). It
feeds `metadataBase`, OG `url`s, the sitemap, and robots (which `noindex`s non-prod).
react-grab loads only when `NEXT_PUBLIC_VERCEL_ENV !== "production"`.

## Autonomous Workflow

After ANY code change, run this verification loop:

```
IMPLEMENT → TYPECHECK → FIX → TEST → COMMIT
```

1. Make changes
2. `bun run typecheck` - Fix all TypeScript errors
3. `bun run fix:unsafe` - Fix lint/format issues
4. `bun run test` - Verify tests pass
5. If any step fails: fix and restart from step 2
6. When all pass: commit

## Quick Reference

| Command               | Purpose                         |
| --------------------- | ------------------------------- |
| `bun run typecheck`   | TypeScript type-check (tsgo)    |
| `bun run fix`         | Lint and format                 |
| `bun run fix:unsafe`  | Auto-fix with unsafe transforms |
| `bun run test`        | Run tests                       |
| `bun run verify`      | All checks in sequence          |
| `bun run db:generate` | Generate migration (ask first)  |
| `bun run db:push`     | Push schema (ask first)         |

## Self-Verification Checklist

Before completing work:

- [ ] `bun run verify` passes
- [ ] No `any` types (use `unknown`)
- [ ] Imports use `@/` alias
- [ ] Client components have `"use client"`
- [ ] New schemas exported from `src/db/schema/index.ts`
- [ ] Anything touching better-auth, drizzle or a secret has `import "server-only"`
- [ ] Mutations are a single statement (D1 has no transactions)

## Error Recovery

If same error persists after 3 fix attempts:

1. Document what was tried
2. Ask user for guidance
3. Do NOT continue blindly

## Project Structure

```
src/
├── app/
│   ├── api/[[...path]]/    # ONE Effect HttpRouter for every dynamic endpoint
│   ├── api/auth/           # better-auth handler
│   ├── journal|building|notes|  # prerendered content pages
│   ├── stash/              # private capture inbox (client)
│   └── routes/             # route planner (client)
├── components/             # site components (masthead, photo-gallery, …)
│   └── ui/                 # shadcn primitives
├── content/                # the site's source of truth — trips, notes,
│                           # projects, flags + the generated photo manifests
├── db/
│   ├── client.ts           # D1 HTTP API via drizzle sqlite-proxy
│   ├── schema/             # Drizzle tables
│   └── migrations/         # drizzle-kit generated (never edit)
├── lib/
│   ├── api/contract.ts     # HttpApi.make("kris-gg") — composes every group
│   ├── auth.ts             # better-auth (passkey + api key), server-only
│   └── site.ts             # siteUrl() / isProd
├── planner/                # /routes domain: ORS, Overpass, ranking, handlers
└── stash/                  # /stash domain: api, handlers, store, mcp, media
```

There is **no** `src/server/`, `src/utils/orpc.ts` or `src/test/`. Tests live
beside the code they cover (`*.test.ts`).

## Database Operations

Cloudflare D1 over its **HTTP API** — there is no local SQLite file and no
`sqlite3` to poke at. See `.claude/skills/drizzle-patterns/SKILL.md` for the
constraints that actually bite (no transactions, single-statement mutations,
ownership in the `WHERE`, the `/raw` row mapping).

**NEVER auto-run**: `db:migrate`. Ask before `db:generate`.

Workflow:

1. Create/modify schema in `src/db/schema/`
2. Export from `src/db/schema/index.ts`
3. Ask: "Run db:generate to create migration?"
4. After approval: `bun run db:generate`
5. Migrations are applied to D1 out-of-band — ask before touching a database

Round-trip a real query against dev D1:

```bash
bun run smoke:d1     # needs the CLOUDFLARE_* vars
bun run smoke:r2     # presigned upload/read/delete against the media bucket
```

## Code Patterns

The four skills hold the real, current patterns — read the relevant one before
writing code rather than copying from here:

| Skill | Covers |
| --- | --- |
| `.claude/skills/backend-patterns/SKILL.md` | HttpApi groups, handlers, layer wiring, the browser-safe/server-only split |
| `.claude/skills/drizzle-patterns/SKILL.md` | D1 over HTTP, no transactions, schema + query rules |
| `.claude/skills/frontend-patterns/SKILL.md` | The promise-shaped Effect client, optimistic updates, Schema.Class rebuilding |
| `.claude/skills/testing-patterns/SKILL.md` | What is worth a `bun:test`, and what the smoke scripts cover instead |

The shape, in brief — an endpoint touches four files, in order:

```ts
// 1. contract — src/stash/api.ts  (BROWSER-IMPORTED: no server-only code)
export class StashGroup extends HttpApiGroup.make("stash")
  .add(
    HttpApiEndpoint.get("list", "/api/stash", {
      success: Schema.Array(StashItem),
      error: [StashStoreError], // an ARRAY — a Schema.Union loses httpApiStatus
    })
  )
  .middleware(StashAuth) {}

// 2. root      — src/lib/api/contract.ts   compose the group into KrisApi
// 3. handler   — src/stash/handlers.ts     thin; identity from CurrentUser
// 4. wiring    — src/app/api/[[...path]]/route.ts   layer built at module scope
```

### Content page (prerendered, zero client JS)

```tsx
// src/app/{route}/page.tsx — reads from src/content/*, no "use client"
export default function MyPage() {
  return (
    <div className="container py-8">
      <h1 className="font-bold text-2xl">Title</h1>
    </div>
  );
}
```

### Photos

Galleries are built locally by the `photos:*` pipeline and served from R2
(`i.kris.gg`) — `public/photos/` is gitignored, the Vercel build does zero
image work. Only `src/content/photos.generated.json` (R2 URLs) and
`photos.meta.json` (captions/tags) are committed.

```
photos:mine <slug> --from .. --to ..   export ≤1024px previews from Apple Photos
photos:itinerary <pool> [--partition]  cluster by GPS → per-location legs
photos:curate <slug>                   Gemini classify + comparative ranking
photos:review [slug]                   local browser dashboard: pick + order
photos:place <slug> [--download|--auto] commit winners as public/photos/<slug>/NN.jpg
photos:meta                            join placed.json + scored.json → photos.meta.json
photos:publish                         encode webp variants, upload to R2
```

A new trip needs an entry in `src/content/trips.ts` **before** `photos:curate`
(both curate and place validate the slug via `getTrip`), plus a `FLAGS` entry
keyed by its `location`.

## Components

See `COMPONENTS.md`. Available primitives under `@/components/ui/`:

`avatar` `badge` `button` `card` `checkbox` `dialog` `dropdown-menu`
`input` `input-group` `label` `pagination` `progress` `select` `separator`
`sheet` `skeleton` `slider` `sonner` `switch` `table` `tabs` `textarea`
`tooltip`

There is no chart component — add one only if a page actually needs it.

## Auth

better-auth with **passkey** (browser) + **API key** (Raycast, CLI, MCP), in
`src/lib/auth.ts` (`server-only`). Single user, enforced by `resolveUser`.

- Endpoints authenticate through `StashAuth`; handlers read `CurrentUser`.
- Client: `authClient.useSession()` for session state.
- `session.cookieCache` is load-bearing — every uncached check is a
  Vercel → Cloudflare round-trip.
## Instruction Protocol

At session start, check `.claude/INSTRUCTION.md`. If present:

1. Read instruction completely
2. Plan implementation based on requirements
3. Implement with small, verified commits
4. Run `bun run verify` after each change
5. Check off acceptance criteria as completed
6. Final commit: `feat: complete [instruction title]`
7. Rename to `INSTRUCTION.done.md`

### INSTRUCTION.md Format

```markdown
# Instruction: [Title]

## Objective

[What to build in 1-2 sentences]

## Requirements

- [Feature 1]
- [Feature 2]

## Acceptance Criteria

- [ ] [Verifiable criterion 1]
- [ ] `bun run verify` passes

## Reference Skills

- See: `.claude/skills/[relevant-skill].md`
```

## Mobile-First Default

All UI must be mobile-first:

- Touch targets min 44x44px
- Stack on mobile, grid on desktop
- Bottom actions with Sheet component
- Test at 375px width (iPhone SE)

See `.claude/skills/mobile-patterns/SKILL.md` for patterns.

## Charts

Use `@/components/ui/chart` for data visualization:

- LineChart - progress over time
- BarChart - comparisons
- AreaChart - cumulative data
- PieChart - distribution

See `.claude/skills/frontend-patterns/charts.md` for patterns.

## Commit Workflow

1. `git status`
2. `git diff`
3. Stage specific files: `git add src/specific/file.ts`
4. Commit:

   ```bash
   git commit -m "$(cat <<'EOF'
   feat: description

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

Never: `git add .`, `git add -A`, force push, amend without asking

## Conventions

- Use `@/` import alias
- `unknown` over `any`
- `const` by default
- Arrow functions for callbacks
- `async/await` over promise chains
- Semantic HTML + ARIA attributes
