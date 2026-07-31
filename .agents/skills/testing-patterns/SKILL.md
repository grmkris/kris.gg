---
name: testing-patterns
description: How kris.gg is actually tested — bun:test over pure functions and schemas, with real-database checking done by a smoke script rather than fixtures. Use when adding tests, deciding whether something is worth testing, or verifying a change.
globs:
  - src/**/*.test.ts
  - scripts/d1-smoke.ts
alwaysApply: false
---

# Testing Patterns

`bun test` — 122 tests across 10 files. There is **no test database, no fixture
harness and no `src/test/` directory**; earlier guidance describing in-memory
SQLite setups refers to a template that was deleted.

The shape is deliberate: the database is Cloudflare D1 reached over HTTP, so a
"unit" test against it would be a network test. Instead:

- **Pure logic gets unit tests.** `src/lib/route/*` (geometry, GPX, pace,
  export URLs), `src/planner/*` (ranking, constraint fallback, Overpass and ORS
  request building), `src/stash/schema.test.ts`, `src/db/client.test.ts` (the
  transaction guard and row mapping, no network).
- **Anything touching D1 gets a smoke script**, not a test:
  `bun run scripts/d1-smoke.ts` round-trips a real item and asserts the
  silent-failure mappings. Run it after any change to `src/db/client.ts` or a
  store.

## Writing a test

```ts
import { describe, expect, it } from "bun:test";

import { haversineM } from "./geo";

describe("haversineM", () => {
  it("measures a degree of latitude at roughly 111km", () => {
    const distance = haversineM([14.5, 46], [14.5, 47]);
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });
});
```

Tests sit **next to the module** (`geo.ts` → `geo.test.ts`), not in a mirror
tree. Import through the relative path, not `@/`.

Assert on properties and ranges rather than golden values where the maths is
approximate — `toBeGreaterThan`/`toBeLessThan` around a known real-world figure
documents intent better than a 15-digit literal, and does not break on a
rounding change.

For network-shaped code, inject the fetcher instead of mocking globals. Both
`fetchPois` and the ORS client take a `fetchImpl`, so a test hands them a stub
and asserts the request that would have been sent:

```ts
const query = buildOverpassQuery({ categories: ["cafe"], coords: route });
expect(query).toContain('["amenity"="cafe"]');
```

## The gate

```
bun run verify     # typecheck + ultracite check (non-mutating) + bun test
```

**Never** wire `bun run fix` into a gate. It rewrites the tree it is meant to be
checking, and its autofixes have changed behaviour: `no-plusplus` turned
`const i = next++` into `const i = next += 1`, and `unicorn/prefer-at` turned
`coords[i - 1]` into `coords.at(i - 1)` (`T | undefined`). `fix` is a deliberate,
separate action — and typecheck immediately after running it.

Before committing anything that touches the dynamic routes, also:

```
bun run build      # then confirm no drizzle-orm / api.cloudflare.com / token
                   # in .next/static/chunks, and Effect chunks only on
                   # /stash and /routes
```
