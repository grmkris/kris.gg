# Schema Patterns (SQLite + Drizzle)

## Creating a New Table

1. Create schema file `src/db/schema/{name}.ts`:

```typescript
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const items = sqliteTable(
  "items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft", "active", "archived"] }).default(
      "draft"
    ),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("items_user_id_idx").on(table.userId)]
);

export const itemRelations = relations(items, ({ one }) => ({
  user: one(user, {
    fields: [items.userId],
    references: [user.id],
  }),
}));
```

2. Export from `src/db/schema/index.ts`:

```typescript
export { items, itemRelations } from "./items";
```

3. Generate and push (ask user first!):
   - `bun run db:generate`
   - `bun run db:push`

## Column Types

| Type                                       | SQLite  | Usage                        |
| ------------------------------------------ | ------- | ---------------------------- |
| `text("col")`                              | TEXT    | Strings, UUIDs               |
| `integer("col")`                           | INTEGER | Numbers                      |
| `integer("col", { mode: "boolean" })`      | INTEGER | Booleans (0/1)               |
| `integer("col", { mode: "timestamp_ms" })` | INTEGER | Timestamps                   |
| `text("col", { enum: [...] })`             | TEXT    | Enums (app-level validation) |

## Timestamp Pattern

```typescript
createdAt: integer("created_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .notNull(),
updatedAt: integer("updated_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .$onUpdate(() => new Date())
  .notNull(),
```

## Relations

### One-to-Many

```typescript
// Parent (user has many items)
export const userRelations = relations(user, ({ many }) => ({
  items: many(items),
}));

// Child (item belongs to user)
export const itemRelations = relations(items, ({ one }) => ({
  user: one(user, {
    fields: [items.userId],
    references: [user.id],
  }),
}));
```

### Many-to-Many (via junction table)

```typescript
export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })]
);
```

## Indexes

Always add indexes on:

- Foreign keys (`userId`, `itemId`, etc.)
- Columns frequently used in WHERE clauses
- Columns used in ORDER BY

```typescript
(table) => [
  index("items_user_id_idx").on(table.userId),
  index("items_status_idx").on(table.status),
  index("items_created_at_idx").on(table.createdAt),
];
```
