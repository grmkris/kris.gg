# Instruction: Bring /stash online against real Cloudflare D1

**Status: done on `dev`, verified on `dev.kris.gg`.** Images, motion and PWA
landed after the original handoff — see "Later work" below. Everything that can be
checked without a browser has been. What remains is the passkey ceremony itself
(needs a real authenticator) and the promotion to production.

## What /stash is

A personal "I'll need this later" inbox, inspired by
[Copper](https://shadcn.com/copper). Single user, private, **not** published
content and **not** wired into `src/content/*`.

A web page cannot read the OS text selection or bind a global hotkey — that needs
a native app with a macOS Accessibility grant. So `/stash` is the **triage UI**,
and **capture happens elsewhere**: CLI, Raycast, and an MCP endpoint agents can
write to. The agent-writable inbox is the part Copper structurally cannot do.

## Infrastructure

| | |
| --- | --- |
| Cloudflare account | `bceaeae4788dce3493514fde194b4a7e` |
| `kris-stash-dev` | `50d682a5-d57f-4f97-abe8-e8876a391f83` — migrated, in use by localhost + dev.kris.gg |
| `kris-stash-prod` | `5ab11715-827f-46fd-9b62-2fe8e053d0f9` — created, **empty, unmigrated** |
| Vercel Preview (dev) | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`, `BETTER_AUTH_SECRET`, `STASH_REGISTRATION_SECRET` |
| Local | same five in `.env` (gitignored, mode 600) |

Migration `0000_futuristic_ken_ellis` (from the `/routes` work — it covers all 8
tables) is applied to the dev database. An earlier `0000_public_ikaris` generated
in this session was discarded when the branches converged, and the dev database
was dropped and re-migrated so its history matches the repo exactly.

## What changed

- **Passkey registration did not exist.** The UI only offered
  `signIn.passkey()`, `emailAndPassword` is off, and `addPasskey` needs a
  session, so the first user could never be created. Now
  `registration.requireSession: false` + `resolveUser` in `src/lib/auth.ts`,
  gated on `STASH_REGISTRATION_SECRET`, binding to the single existing account —
  which also closes the deferred single-user gate.
- **API keys died after ten requests.** better-auth's api-key plugin defaults to
  10 per key per *day*; every surface then 401s silently. Disabled in config and
  at mint time.
- **MCP identity** reads the request off the current fiber's context rather than
  a middleware-provided `Context.Reference`.
- `scripts/stash-key.ts` mints keys; `scripts/d1-smoke.ts` round-trips an item
  through real D1 and asserts the mappings that fail silently.
- `bun run verify` is now non-mutating (`ultracite check`, not `fix`) — the old
  gate rewrote the tree it was checking, and its autofixes change behaviour.

## Verified

- [x] Both D1 databases exist; env set locally and on Vercel Preview (dev)
- [x] Migration applied to the dev database
- [x] Real `SELECT` returns correctly-shaped rows — 23/23 smoke checks, covering
      the `/raw` rows path, int→boolean, epoch ms→Date, JSON text→array,
      cross-user rejection, and the transaction guard
- [x] Registration gate: wrong/absent secret 401s, correct secret returns
      WebAuthn options (rpID `localhost` locally, `kris.gg` on dev)
- [x] Single-user rule: repeated registration attempts leave exactly one row
- [x] `bun run stash "…"` and `--list` against `dev.kris.gg`
- [x] `/api/stash` 401 without a credential, 200 with one
- [x] MCP over `dev.kris.gg`: `tools/list`, `stash_add`, `stash_list`; refused
      without a key, and the refused write never reached the database
- [x] Public site unaffected: content routes prerender, `/stash` is `noindex`
      and absent from the sitemap
- [x] Effect chunks load only on `/stash` and `/routes` across 773 pages; no
      `drizzle-orm`, `api.cloudflare.com` or token in `.next/static/chunks`
- [x] `bun run verify` — 122 tests, no lint or type errors

## Later work (2026-07-31)

Three follow-ups beyond the original instruction, all live on `dev.kris.gg`:

- **Images.** ⌘V, drag-and-drop and a file picker. A private R2 bucket
  (`kris-stash-media`) with presigned direct-to-R2 uploads; the browser
  downscales and derives an inline placeholder in an OffscreenCanvas first, so
  nothing large crosses the wire and `sharp` stays off the request path.
  Attachments are a JSON column (D1 has no transactions). Verified live:
  upload → presigned read → delete removes the object.
  `bun run smoke:r2` guards the signing.
- **Perceived speed.** Capture was awaiting the round trip before rendering;
  it is optimistic now, with skeletons and enter/exit motion that respects
  `prefers-reduced-motion`.
- **PWA.** Installable, with a "New capture" shortcut and a GET share target at
  `/stash/share`. iOS supports neither, so `scripts/ios-shortcut.md` documents
  the Shortcuts.app action that does work there.

Env added since: `R2_STASH_BUCKET`, `R2_STASH_ACCESS_KEY_ID`,
`R2_STASH_SECRET_ACCESS_KEY`, plus `ORS_API_KEY` and
`GOOGLE_GENERATIVE_AI_API_KEY` for `/routes`. All set locally and on Vercel
Preview (dev). Migration `0001` adds the attachments column.

## Left to do

- [ ] **Register a passkey** at <https://dev.kris.gg/stash> → "Register a new
      device" → paste `STASH_REGISTRATION_SECRET` (in `.env`). Needs a real
      authenticator, so it cannot be scripted.
- [ ] Exercise the UI: capture, toggle done, delete; keyboard `/` focus, `⌘↵`
      save, `j`/`k` move, `x` toggle, `e` delete.
- [ ] **Retest on the phone** — mobile is where rpID/origin problems surface.
- [ ] Rotate `STASH_REGISTRATION_SECRET` once devices are enrolled: it travels
      as a query parameter and lands in access logs.
- [ ] Production: migrate `kris-stash-prod` (**both** migrations), set Production
      env vars, promote with a `dev`→`main` **merge-commit** PR (never squash).

## Not built

- Browser extension (MV3 context-menu capture)
- OAuth for claude.ai custom connectors — would need better-auth's **OAuth
  Provider** plugin, not its `mcp` plugin. Bearer/API key suffices for Claude Code.
- FTS5 search

## Known, unrelated

All cleared on 2026-08-12 (`baa95e2`): `sonner.tsx` has its own `"use client"`,
`README.md` and the project `CLAUDE.md` describe the real stack, and the
orphans (`local.db`, `apps/kris.gg/`, a stray `a.out`, an osxphotos crash log)
are gone. The four skills were already rewritten in `4d930c3`.

One thing to know: the local `.env` now holds **only** `GOOGLE_GENERATIVE_AI_API_KEY`
and `GEMINI_MODEL` — the five `CLOUDFLARE_*` / `BETTER_AUTH_*` /
`STASH_REGISTRATION_SECRET` values this document describes are no longer there.
`bun run smoke:d1` and any local `/stash` work need them restored first, and
migrating `kris-stash-prod` needs `CLOUDFLARE_D1_TOKEN`.

## Escape hatch

If `/stash` feels sluggish, every query is one Vercel → Cloudflare round-trip.
`session.cookieCache` already keeps auth off that path. The real fix is moving
the API to a Worker at `api.kris.gg` with a native D1 binding: the Effect/HttpApi
code ports unchanged, only the host and cookie/CORS config move
(`crossSubDomainCookies` + `trustedOrigins`).
