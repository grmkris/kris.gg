---
name: frontend-patterns
description: Client patterns for kris.gg's dynamic routes — the promise-shaped Effect client, optimistic updates against a high-latency database, rebuilding Schema.Class instances, and keeping the content pages free of client JS. Use when building or changing anything under src/app/stash or src/app/routes.
globs:
  - src/app/stash/**/*.tsx
  - src/app/stash/**/*.ts
  - src/app/routes/**/*.tsx
  - src/lib/api/runtime.ts
alwaysApply: false
---

# Frontend Patterns

There is no React Query and no ORPC here. Components talk to a **typed Effect
client** through a thin promise-shaped wrapper, and the app is static everywhere
except `/stash` and `/routes`.

## The three-layer client seam

```
component (src/app/stash/stash-view.tsx)      ← plain promises, no Effect
  └─ stash-client.ts                          ← promise wrappers
       └─ src/lib/api/runtime.ts              ← the ONLY module touching Effect's runtime
            └─ HttpApiClient over src/lib/api/contract.ts (shared with the server)
```

That shared contract import is what makes the client fully typed **with no
codegen step**. Keep the runtime confined to `runtime.ts`: it is what bounds the
Effect bundle to these two routes.

```ts
// stash-client.ts — components never see an Effect
export const listStash = async (): Promise<readonly StashItem[]> => {
  const api = await getApi();
  return await runApi(api.stash.list());
};
```

`getApi()` builds lazily and memoizes, because Next module-evaluates client
components on the server — eager construction at module scope breaks the build.

## Optimistic updates are mandatory, not a nicety

Every write is one Vercel → Cloudflare round trip (see `drizzle-patterns`). If
the UI waits for the response, it visibly stalls. Update state first, reconcile
on success, roll back on failure:

```ts
const toggleDone = useCallback(async (item: StashItem) => {
  setItems((current) => current.map((i) => (i.id === item.id ? withDone(i, !i.done) : i)));
  try {
    await updateStash(item.id, { done: !item.done });
  } catch (error) {
    setItems((current) => current.map((i) => (i.id === item.id ? withDone(i, item.done) : i)));
    toast.error(`Could not update: ${String(error)}`);
  }
}, []);
```

For **create**, insert a provisional row with a client-generated id and swap in
the server row when it lands; restore the draft text if it fails. Never render a
spinner where the item will appear.

## Never spread a `Schema.Class`

`StashItem` is an Effect `Schema.Class`. `{ ...item, done }` returns a **plain
object still typed as `StashItem`** — the prototype is gone and the type is a
lie. Rebuild through the constructor:

```ts
const withDone = (item: StashItem, done: boolean): StashItem =>
  new StashItem({ ...item, done });
```

The lint rule `typescript/no-misused-spread` catches this; the disable comment on
that line is the acknowledgement, not a workaround.

## Async handlers in JSX

An `async` function passed straight to `onClick` is an unhandled rejection
waiting to happen. Wrap it, with braces:

```tsx
<button onClick={() => { void signIn(); }} type="button">
```

Bare `onClick={signIn}` trips `no-misused-promises`; the shorthand
`() => void signIn()` trips `no-confusing-void-expression`. Braces satisfy both.

## Bundle discipline

The public site (`/`, `/journal`, `/building`, `/notes`) is prerendered and must
stay free of the Effect/auth/planner chunks. Only `/stash` and `/routes` may grow.
After a build:

```bash
# effect chunks must map to /stash and /routes only
for f in .next/static/chunks/*.js; do
  grep -ql "EffectPrimitive\|HttpApiClient" "$f" &&
    echo "$(basename $f) -> $(grep -rl $(basename $f) .next/server/app/*.html | xargs -n1 basename)"
done
```

Mount route-specific providers inside the route, not in the root layout —
`<Toaster/>` is rendered from `stash-view.tsx` for exactly this reason (and
because `components/ui/sonner.tsx` is missing its own `"use client"`).

## Mobile

Touch targets ≥ 44×44px, test at 375px. See `mobile-patterns`.

## Motion

For animation decisions use `make-interfaces-feel-better` (and `apple-design`
for gesture/spring work). The short version: CSS transitions for anything
interactive because they are interruptible, keyframes only for one-shot
sequences, and always honour `prefers-reduced-motion`.
