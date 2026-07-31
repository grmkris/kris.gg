/**
 * `RoutesGroup` and `RoutesPublicGroup` implementations. Handlers stay thin —
 * generation lives in `plan.ts`, persistence in `store.ts`, auth in `StashAuth`.
 *
 * The public group has no middleware and therefore no `CurrentUser`: a share
 * link has to open for someone with no passkey. It can only ever read a route
 * whose `shareId` is set, which is null until sharing is explicitly turned on.
 */

import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { KrisApi } from "@/lib/api/contract";
import { planRoute } from "./plan";
import { CurrentUser } from "@/stash/middleware";
import type { PlannedRouteId } from "./schema";
import { PlannerStore } from "./store";

export const RoutesGroupLayer = HttpApiBuilder.group(
  KrisApi,
  "routes",
  (handlers) =>
    Effect.gen(function* () {
      const store = yield* PlannerStore;

      return handlers
        .handle("plan", ({ payload }) =>
          // planRoute already degrades AI and POI failures internally; what
          // reaches here is a genuine routing failure.
          Effect.tryPromise({
            catch: (cause) => cause as never,
            try: () =>
              planRoute(payload.inputs, { seedBase: payload.seedBase }),
          })
        )
        .handle("list", () =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.list(userId);
          })
        )
        .handle("save", ({ payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.save(userId, payload.route);
          })
        )
        .handle("share", ({ params, payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.setShared(
              userId,
              params.id as PlannedRouteId,
              payload.shared
            );
          })
        )
        .handle("remove", ({ params }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            yield* store.remove(userId, params.id as PlannedRouteId);
            return { ok: true } as const;
          })
        );
    })
);

export const RoutesPublicGroupLayer = HttpApiBuilder.group(
  KrisApi,
  "routesPublic",
  (handlers) =>
    Effect.gen(function* () {
      const store = yield* PlannerStore;

      return handlers.handle("shared", ({ params }) =>
        store.bySharedId(params.shareId)
      );
    })
);
