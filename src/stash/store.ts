/**
 * `StashStore` — the only place that talks to D1.
 *
 * Every method is deliberately ONE statement: D1 has no usable transactions
 * (see `src/db/client.ts`), so any multi-write invariant would be unenforceable.
 */

import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";

import { db as defaultDb } from "@/db/client";
import type { Db } from "@/db/client";
import { stashItem } from "@/db/schema/stash";
import type { StashItemRow } from "@/db/schema/stash";

import { StashItem, StashItemNotFound, StashStoreError } from "./schema";
import type { CreateStashItem, StashItemId, UpdateStashItem } from "./schema";

const decodeItem = Schema.decodeUnknownSync(StashItem);

/** D1 row → domain object. Dates cross the wire as epoch millis. */
const toDomain = (row: StashItemRow): StashItem =>
  decodeItem({
    archivedAt: row.archivedAt === null ? null : row.archivedAt.getTime(),
    body: row.body,
    createdAt: row.createdAt.getTime(),
    done: row.done,
    attachments: (row.attachments ?? []).map((a) => ({ ...a, url: "" })),
    id: row.id,
    kind: row.kind,
    source: row.source,
    tags: row.tags ?? [],
    title: row.title,
    updatedAt: row.updatedAt.getTime(),
    url: row.url,
  });

const wrap = <A>(thunk: () => Promise<A>): Effect.Effect<A, StashStoreError> =>
  Effect.tryPromise({
    catch: (cause) => new StashStoreError({ message: String(cause) }),
    try: thunk,
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
  /** Resolves with the removed row's attachment keys, for object cleanup. */
  readonly remove: (
    userId: string,
    id: StashItemId
  ) => Effect.Effect<readonly string[], StashItemNotFound | StashStoreError>;
}

export class StashStore extends Context.Service<StashStore, StashStoreShape>()(
  "kris-gg/StashStore"
) {}

export const makeStashStore = (db: Db): StashStoreShape => ({
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
            attachments: (input.attachments ?? []).map((a) => ({
              bytes: a.bytes,
              contentType: a.contentType,
              height: a.height,
              key: a.key,
              placeholder: a.placeholder ?? null,
              width: a.width,
            })),
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

  list: Effect.fn("StashStore.list")((userId: string) =>
    wrap(() =>
      db
        .select()
        .from(stashItem)
        .where(eq(stashItem.userId, userId))
        .orderBy(desc(stashItem.createdAt))
    ).pipe(Effect.map((rows) => rows.map(toDomain)))
  ),

  remove: Effect.fn("StashStore.remove")((userId: string, id: StashItemId) =>
    wrap(() =>
      db
        .delete(stashItem)
        .where(and(eq(stashItem.id, id), eq(stashItem.userId, userId)))
        .returning()
    ).pipe(
      Effect.flatMap((rows) => {
        const row = rows[0];
        return row === undefined
          ? Effect.fail(new StashItemNotFound({ id }))
          : Effect.succeed((row.attachments ?? []).map((a) => a.key));
      })
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
});

export const StashStoreLayer = Layer.succeed(StashStore)(
  makeStashStore(defaultDb)
);
