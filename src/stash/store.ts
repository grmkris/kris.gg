/**
 * `StashStore` — the only place that talks to D1.
 *
 * Every method is deliberately ONE statement: D1 has no usable transactions
 * (see `src/db/client.ts`), so any multi-write invariant would be unenforceable.
 */

import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { db as defaultDb, type Db } from "@/db/client";
import { type StashItemRow, stashItem } from "@/db/schema/stash";
import {
  type CreateStashItem,
  StashItem,
  type StashItemId,
  StashItemNotFound,
  StashStoreError,
  type UpdateStashItem,
} from "./schema";

const decodeItem = Schema.decodeUnknownSync(StashItem);

/** D1 row → domain object. Dates cross the wire as epoch millis. */
const toDomain = (row: StashItemRow): StashItem =>
  decodeItem({
    id: row.id,
    body: row.body,
    kind: row.kind,
    url: row.url,
    title: row.title,
    tags: row.tags ?? [],
    done: row.done,
    source: row.source,
    archivedAt: row.archivedAt === null ? null : row.archivedAt.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  });

const wrap = <A>(
  thunk: () => Promise<A>
): Effect.Effect<A, StashStoreError> =>
  Effect.tryPromise({
    try: thunk,
    catch: (cause) => new StashStoreError({ message: String(cause) }),
  });

export interface StashStoreShape {
  readonly list: (
    userId: string
  ) => Effect.Effect<readonly StashItem[], StashStoreError>;
  readonly create: (
    userId: string,
    input: CreateStashItem
  ) => Effect.Effect<StashItem, StashStoreError>;
  readonly update: (
    userId: string,
    id: StashItemId,
    input: UpdateStashItem
  ) => Effect.Effect<StashItem, StashItemNotFound | StashStoreError>;
  readonly remove: (
    userId: string,
    id: StashItemId
  ) => Effect.Effect<void, StashItemNotFound | StashStoreError>;
}

export class StashStore extends Context.Service<StashStore, StashStoreShape>()(
  "kris-gg/StashStore"
) {}

export const makeStashStore = (db: Db): StashStoreShape => ({
  list: Effect.fn("StashStore.list")((userId: string) =>
    wrap(() =>
      db
        .select()
        .from(stashItem)
        .where(eq(stashItem.userId, userId))
        .orderBy(desc(stashItem.createdAt))
    ).pipe(Effect.map((rows) => rows.map(toDomain)))
  ),

  create: Effect.fn("StashStore.create")(
    (userId: string, input: CreateStashItem) =>
      wrap(() =>
        db
          .insert(stashItem)
          .values({
            userId,
            body: input.body,
            kind: input.kind ?? "note",
            url: input.url ?? null,
            title: input.title ?? null,
            tags: [...(input.tags ?? [])],
            source: input.source ?? "web",
          })
          .returning()
      ).pipe(
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(
                new StashStoreError({ message: "insert returned no row" })
              )
            : Effect.succeed(toDomain(rows[0]))
        )
      )
  ),

  update: Effect.fn("StashStore.update")(
    (userId: string, id: StashItemId, input: UpdateStashItem) =>
      wrap(() =>
        db
          .update(stashItem)
          .set({
            ...(input.body === undefined ? {} : { body: input.body }),
            ...(input.done === undefined ? {} : { done: input.done }),
            ...(input.tags === undefined ? {} : { tags: [...input.tags] }),
            ...(input.archived === undefined
              ? {}
              : { archivedAt: input.archived ? new Date() : null }),
          })
          // userId in the WHERE is the ownership check — no read-then-write,
          // which would need a transaction D1 cannot give us.
          .where(and(eq(stashItem.id, id), eq(stashItem.userId, userId)))
          .returning()
      ).pipe(
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(new StashItemNotFound({ id }))
            : Effect.succeed(toDomain(rows[0]))
        )
      )
  ),

  remove: Effect.fn("StashStore.remove")((userId: string, id: StashItemId) =>
    wrap(() =>
      db
        .delete(stashItem)
        .where(and(eq(stashItem.id, id), eq(stashItem.userId, userId)))
        .returning()
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0] === undefined
          ? Effect.fail(new StashItemNotFound({ id }))
          : Effect.void
      )
    )
  ),
});

export const StashStoreLayer = Layer.succeed(StashStore)(
  makeStashStore(defaultDb)
);
