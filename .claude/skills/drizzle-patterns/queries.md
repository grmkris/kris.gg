# Drizzle Query Patterns

## Select Queries

### Basic Select

```typescript
import { db } from "@/db";
import { items } from "@/db/schema";

const allItems = await db.select().from(items);
```

### Select with Filter

```typescript
import { eq, and, or, like, gt, lt, isNull, ne } from "drizzle-orm";

// Single condition
const item = await db.select().from(items).where(eq(items.id, id));

// Multiple conditions (AND)
const activeItems = await db
  .select()
  .from(items)
  .where(and(eq(items.status, "active"), eq(items.userId, userId)));

// OR conditions
const results = await db
  .select()
  .from(items)
  .where(or(eq(items.status, "draft"), eq(items.status, "pending")));

// LIKE search
const matches = await db
  .select()
  .from(items)
  .where(like(items.name, `%${searchTerm}%`));

// Comparison
const recent = await db
  .select()
  .from(items)
  .where(gt(items.createdAt, oneWeekAgo));
```

### Select Specific Columns

```typescript
const names = await db.select({ id: items.id, name: items.name }).from(items);
```

### Ordering and Limits

```typescript
import { desc, asc } from "drizzle-orm";

const recentItems = await db
  .select()
  .from(items)
  .orderBy(desc(items.createdAt))
  .limit(10)
  .offset(0);
```

## Insert

```typescript
// Single insert
const [newItem] = await db
  .insert(items)
  .values({
    name: "New Item",
    userId: user.id,
  })
  .returning();

// Bulk insert
await db.insert(items).values([
  { name: "Item 1", userId: user.id },
  { name: "Item 2", userId: user.id },
]);
```

## Update

```typescript
// SAFETY: Always include WHERE clause!
const [updated] = await db
  .update(items)
  .set({ name: "Updated Name", updatedAt: new Date() })
  .where(eq(items.id, itemId))
  .returning();

// Update with ownership check
const [updated] = await db
  .update(items)
  .set({ status: "archived" })
  .where(and(eq(items.id, itemId), eq(items.userId, userId)))
  .returning();
```

## Delete

```typescript
// SAFETY: Always include WHERE clause!
await db.delete(items).where(eq(items.id, itemId));

// With ownership check
await db
  .delete(items)
  .where(and(eq(items.id, itemId), eq(items.userId, userId)));
```

## Query with Relations

```typescript
// Using the query API (requires schema in drizzle config)
const usersWithItems = await db.query.user.findMany({
  with: {
    items: true,
  },
});

const itemWithUser = await db.query.items.findFirst({
  where: eq(items.id, itemId),
  with: {
    user: true,
  },
});
```

## Safety Guidelines

### CRITICAL: Always Use WHERE Clauses

```typescript
// DANGER - updates ALL rows!
await db.update(items).set({ status: "deleted" });

// SAFE - updates specific row
await db.update(items).set({ status: "deleted" }).where(eq(items.id, id));

// DANGER - deletes ALL rows!
await db.delete(items);

// SAFE - deletes specific row
await db.delete(items).where(eq(items.id, id));
```

### Always Verify Ownership

```typescript
// BAD - anyone can delete
await db.delete(items).where(eq(items.id, input.id));

// GOOD - only owner can delete
await db
  .delete(items)
  .where(
    and(eq(items.id, input.id), eq(items.userId, context.session.user.id))
  );
```

### Check Return Values

```typescript
// Check if update actually modified anything
const [updated] = await db
  .update(items)
  .set(data)
  .where(eq(items.id, id))
  .returning();

if (!updated) {
  throw new ORPCError("NOT_FOUND", { message: "Item not found" });
}
```

## Common Patterns

### Upsert (Insert or Update)

```typescript
import { sql } from "drizzle-orm";

await db
  .insert(items)
  .values({ id, name, userId })
  .onConflictDoUpdate({
    target: items.id,
    set: { name, updatedAt: new Date() },
  });
```

### Count

```typescript
import { count } from "drizzle-orm";

const [{ value }] = await db
  .select({ value: count() })
  .from(items)
  .where(eq(items.userId, userId));
```

### Exists Check

```typescript
const [existing] = await db
  .select({ id: items.id })
  .from(items)
  .where(eq(items.name, name))
  .limit(1);

if (existing) {
  throw new ORPCError("BAD_REQUEST", { message: "Item already exists" });
}
```
