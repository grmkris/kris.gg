/**
 * The stash domain schema — one definition decoded at every boundary: the HTTP
 * body, the D1 row, and the typed client. Before this the repo had no runtime
 * validation at all.
 */

import { Schema } from "effect";

export const StashItemId = Schema.String.pipe(Schema.brand("StashItemId"));
export type StashItemId = typeof StashItemId.Type;

export const StashKind = Schema.Literals([
  "note",
  "link",
  "prompt",
  "todo",
  "image",
]);
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

/**
 * An uploaded image. Stored as a JSON array on the row rather than in a child
 * table: D1 has no transactions, so an item and its attachments have to be
 * written in a single statement.
 *
 * `url` is **not** persisted — the bucket is private, so it is a short-lived
 * presigned GET minted per read. `placeholder` is a tiny inline data URI (the
 * same trick the photo pipeline uses for `blur`) so a thumbnail has something
 * to show before the real bytes arrive.
 */
export class StashAttachment extends Schema.Class<StashAttachment>(
  "StashAttachment"
)({
  key: Schema.String,
  url: Schema.String,
  contentType: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
  bytes: Schema.Number,
  placeholder: Schema.NullOr(Schema.String),
}) {}

/** What the client sends on create — no `url`, the server mints those. */
export const NewStashAttachment = Schema.Struct({
  key: Schema.NonEmptyString,
  contentType: Schema.NonEmptyString,
  width: Schema.Number,
  height: Schema.Number,
  bytes: Schema.Number,
  placeholder: Schema.optional(Schema.String),
});
export type NewStashAttachment = typeof NewStashAttachment.Type;

export class StashItem extends Schema.Class<StashItem>("StashItem")({
  attachments: Schema.Array(StashAttachment),
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
const CreateStashItemFields = Schema.Struct({
  attachments: Schema.optional(Schema.Array(NewStashAttachment)),
  /**
   * May be empty *only* when an image is attached — an image on its own is a
   * capture. Enforced by the check below rather than by `NonEmptyString`, so
   * the CLI and MCP still cannot post a wholly empty item.
   */
  body: Schema.String,
  kind: Schema.optional(StashKind),
  source: Schema.optional(StashSource),
  tags: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

export const CreateStashItem = CreateStashItemFields.check(
  Schema.makeFilter(
    (input) =>
      input.body.trim() !== "" || (input.attachments?.length ?? 0) > 0
        ? undefined
        : "A capture needs a body or at least one attachment.",
    { title: "nonEmptyCapture" }
  )
);
export type CreateStashItem = typeof CreateStashItem.Type;

/** Triage payload — every field optional, but each update is one statement. */
export const UpdateStashItem = Schema.Struct({
  archived: Schema.optional(Schema.Boolean),
  body: Schema.optional(Schema.String),
  done: Schema.optional(Schema.Boolean),
  tags: Schema.optional(Schema.Array(Schema.String)),
});
export type UpdateStashItem = typeof UpdateStashItem.Type;

/** Request for somewhere to put an image. */
export const UploadRequest = Schema.Struct({
  contentType: Schema.NonEmptyString,
  bytes: Schema.Number,
});
export type UploadRequest = typeof UploadRequest.Type;

/** Where to PUT it, and the key to hand back on create. */
export class UploadTicket extends Schema.Class<UploadTicket>("UploadTicket")({
  key: Schema.String,
  uploadUrl: Schema.String,
}) {}

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

export class UploadRejected extends Schema.TaggedErrorClass<UploadRejected>()(
  "UploadRejected",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

export class StashStoreError extends Schema.TaggedErrorClass<StashStoreError>()(
  "StashStoreError",
  { message: Schema.String },
  { httpApiStatus: 500 }
) {}
