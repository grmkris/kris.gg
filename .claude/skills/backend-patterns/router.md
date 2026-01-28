# Router Patterns (ORPC)

## Creating Router Procedures

All routers use `context.db` for database access (injected via createApi).

### Basic CRUD

```typescript
// src/server/routers/index.ts
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { items } from "@/db/schema";
import { protectedProcedure, publicProcedure } from "../index";

export const appRouter = {
  // READ: List items for current user
  listItems: protectedProcedure.handler(async ({ context }) => {
    return context.db
      .select()
      .from(items)
      .where(eq(items.userId, context.session.user.id));
  }),

  // READ: Get single item with ownership check
  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [item] = await context.db
        .select()
        .from(items)
        .where(
          and(eq(items.id, input.id), eq(items.userId, context.session.user.id))
        );

      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Item not found" });
      }

      return item;
    }),

  // CREATE
  createItem: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const [item] = await context.db
        .insert(items)
        .values({
          name: input.name,
          description: input.description,
          userId: context.session.user.id,
        })
        .returning();

      return item;
    }),

  // UPDATE
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const [item] = await context.db
        .update(items)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        })
        .where(
          and(eq(items.id, input.id), eq(items.userId, context.session.user.id))
        )
        .returning();

      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Item not found" });
      }

      return item;
    }),

  // DELETE
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const result = await context.db
        .delete(items)
        .where(
          and(eq(items.id, input.id), eq(items.userId, context.session.user.id))
        );

      return { success: true };
    }),
};
```

## Procedure Types

| Type                 | Usage                                     |
| -------------------- | ----------------------------------------- |
| `publicProcedure`    | No auth required                          |
| `protectedProcedure` | Requires auth, has `context.session.user` |

## Error Handling

```typescript
import { ORPCError } from "@orpc/server";

// Common error codes
throw new ORPCError("NOT_FOUND", { message: "Item not found" });
throw new ORPCError("BAD_REQUEST", { message: "Invalid input" });
throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
throw new ORPCError("FORBIDDEN", { message: "Access denied" });
```

## Input Validation

Always use Zod for input validation:

```typescript
.input(z.object({
  // Strings
  name: z.string().min(1).max(100),
  email: z.string().email(),

  // Numbers
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),

  // Optional
  description: z.string().optional(),

  // Enums
  status: z.enum(["draft", "active", "archived"]),

  // Arrays
  tags: z.array(z.string()).max(10),
}))
```

## Pagination Pattern

```typescript
listItems: protectedProcedure
  .input(z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }))
  .handler(async ({ input, context }) => {
    const offset = (input.page - 1) * input.limit;

    const results = await context.db
      .select()
      .from(items)
      .where(eq(items.userId, context.session.user.id))
      .limit(input.limit)
      .offset(offset)
      .orderBy(desc(items.createdAt));

    return {
      items: results,
      page: input.page,
      limit: input.limit,
    };
  }),
```
