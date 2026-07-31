/**
 * `StashGroup` implementation. Handlers stay thin — ownership and error mapping
 * live in `StashStore`, auth in `StashAuth`.
 */

import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { KrisApi } from "@/lib/api/contract";
import { CurrentUser } from "./middleware";
import type { StashItemId } from "./schema";
import { StashStore } from "./store";

export const StashGroupLayer = HttpApiBuilder.group(
  KrisApi,
  "stash",
  (handlers) =>
    Effect.gen(function* () {
      const store = yield* StashStore;

      return handlers
        .handle("list", () =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.list(userId);
          })
        )
        .handle("create", ({ payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.create(userId, payload);
          })
        )
        .handle("update", ({ params, payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            return yield* store.update(
              userId,
              params.id as StashItemId,
              payload
            );
          })
        )
        .handle("remove", ({ params }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            yield* store.remove(userId, params.id as StashItemId);
            return { ok: true } as const;
          })
        );
    })
);
