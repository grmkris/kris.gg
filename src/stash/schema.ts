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
  "ios",
]);
export type StashSource = typeof StashSource.Type;

export class StashItem extends Schema.Class<StashItem>("StashItem")({
  archivedAt: Schema.NullOr(Schema.Number),
  body: Schema.String,
  createdAt: Schema.Number,
  done: Schema.Boolean,
  id: StashItemId,
  kind: StashKind,
  source: StashSource,
  tags: Schema.Array(Schema.String),
  title: Schema.NullOr(Schema.String),
  updatedAt: Schema.Number,
  url: Schema.NullOr(Schema.String),
}) {}

/** Capture payload. `body` is the only thing a capture surface must supply. */
export const CreateStashItem = Schema.Struct({
  body: Schema.NonEmptyString,
  kind: Schema.optional(StashKind),
  source: Schema.optional(StashSource),
  tags: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type CreateStashItem = typeof CreateStashItem.Type;

/** Triage payload — every field optional, but each update is one statement. */
export const UpdateStashItem = Schema.Struct({
  archived: Schema.optional(Schema.Boolean),
  body: Schema.optional(Schema.String),
  done: Schema.optional(Schema.Boolean),
  tags: Schema.optional(Schema.Array(Schema.String)),
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
