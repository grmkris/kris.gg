import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export interface StashAttachmentRow {
  readonly key: string;
  readonly contentType: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly placeholder: string | null;
}

/**
 * A captured fragment. Single-table by design: D1 has no usable transactions,
 * so every mutation must be expressible as one statement.
 */
export const stashItem = sqliteTable(
  "stash_item",
  {
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    /** The captured text. For a link capture this is the note, not the URL. */
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `stx_${crypto.randomUUID().replaceAll("-", "")}`),
    kind: text("kind", { enum: ["note", "link", "prompt", "todo", "image"] })
      .notNull()
      .default("note"),
    /** Where the capture came from — tells you which surfaces actually get used. */
    source: text("source", {
      enum: ["web", "raycast", "cli", "mcp", "extension", "ios"],
    })
      .notNull()
      .default("web"),
    /** JSON string array; D1 has no native array type. */
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    /**
     * Uploaded images, as JSON on the row rather than a child table — D1 has no
     * transactions, so an item and its attachments must be one statement. The
     * presigned `url` is minted per read and never stored.
     */
    attachments: text("attachments", { mode: "json" })
      .$type<StashAttachmentRow[]>()
      .notNull()
      .default(sql`'[]'`),
    title: text("title"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    url: text("url"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    // The inbox view is "my un-archived items, newest first" — one index serves it.
    index("stash_item_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export type StashItemRow = typeof stashItem.$inferSelect;
export type StashItemInsert = typeof stashItem.$inferInsert;
