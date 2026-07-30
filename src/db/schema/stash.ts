import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

/**
 * A captured fragment. Single-table by design: D1 has no usable transactions,
 * so every mutation must be expressible as one statement.
 */
export const stashItem = sqliteTable(
  "stash_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `stx_${crypto.randomUUID().replaceAll("-", "")}`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The captured text. For a link capture this is the note, not the URL. */
    body: text("body").notNull(),
    kind: text("kind", { enum: ["note", "link", "prompt", "todo"] })
      .notNull()
      .default("note"),
    url: text("url"),
    title: text("title"),
    /** JSON string array; D1 has no native array type. */
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    /** Where the capture came from — tells you which surfaces actually get used. */
    source: text("source", {
      enum: ["web", "raycast", "cli", "mcp", "extension"],
    })
      .notNull()
      .default("web"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // The inbox view is "my un-archived items, newest first" — one index serves it.
    index("stash_item_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export type StashItemRow = typeof stashItem.$inferSelect;
export type StashItemInsert = typeof stashItem.$inferInsert;
