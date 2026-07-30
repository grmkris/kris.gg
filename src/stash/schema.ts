/**
 * The stash domain schema — one definition decoded at every boundary: the HTTP
 * body, the D1 row, and the typed client. Before this the repo had no runtime
 * validation at all.
 */

import { Schema } from "effect";

export const StashItemId = Schema.String.pipe(Schema.brand("StashItemId"));
export type StashItemId = typeof StashItemId.Type;

export const StashKind = Schema.Literals(["note", "link", "prompt", "todo"]);
export type StashKind = typeof StashKind.Type;

export const StashSource = Schema.Literals([
  "web",
  "raycast",
  "cli",
  "mcp",
  "extension",
]);
export type StashSource = typeof StashSource.Type;

export class StashItem extends Schema.Class<StashItem>("StashItem")({
  id: StashItemId,
  body: Schema.String,
  kind: StashKind,
  url: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  tags: Schema.Array(Schema.String),
  done: Schema.Boolean,
  source: StashSource,
  archivedAt: Schema.NullOr(Schema.Number),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
}) {}

/** Capture payload. `body` is the only thing a capture surface must supply. */
export const CreateStashItem = Schema.Struct({
  body: Schema.NonEmptyString,
  kind: Schema.optional(StashKind),
  url: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  source: Schema.optional(StashSource),
});
export type CreateStashItem = typeof CreateStashItem.Type;

/** Triage payload — every field optional, but each update is one statement. */
export const UpdateStashItem = Schema.Struct({
  body: Schema.optional(Schema.String),
  done: Schema.optional(Schema.Boolean),
  tags: Schema.optional(Schema.Array(Schema.String)),
  archived: Schema.optional(Schema.Boolean),
});
export type UpdateStashItem = typeof UpdateStashItem.Type;

// ─────────────────────────────────────────────────────────────────────────────
// Errors. Passed to endpoints as an ARRAY so each class's `httpApiStatus`
// annotation is honoured — wrapping them in a Schema.Union loses the per-class
// status and everything degrades to 500.
// ─────────────────────────────────────────────────────────────────────────────

export class StashItemNotFound extends Schema.TaggedErrorClass<StashItemNotFound>()(
  "StashItemNotFound",
  { id: Schema.String },
  { httpApiStatus: 404 }
) {}

export class Unauthorized extends Schema.TaggedErrorClass<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class StashStoreError extends Schema.TaggedErrorClass<StashStoreError>()(
  "StashStoreError",
  { message: Schema.String },
  { httpApiStatus: 500 }
) {}
