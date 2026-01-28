# Service Factory Pattern

Use services to encapsulate business logic that's shared across multiple routers or is complex enough to warrant separation.

## When to Use Services

- Logic is reused across multiple routers
- Complex business rules that don't belong in routers
- Need to compose multiple database operations
- Want testable units of business logic

## Creating a Service

### 1. Define the Service

```typescript
// src/server/services/item-service.ts
import { eq, and } from "drizzle-orm";
import { items } from "@/db/schema";
import type { db as database } from "@/db";

type Database = typeof database;

interface ItemServiceDeps {
  db: Database;
}

export function createItemService({ db }: ItemServiceDeps) {
  return {
    async getById(id: string, userId: string) {
      const [item] = await db
        .select()
        .from(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)));
      return item ?? null;
    },

    async listByUser(userId: string) {
      return db.select().from(items).where(eq(items.userId, userId));
    },

    async create(data: { name: string; userId: string; description?: string }) {
      const [item] = await db.insert(items).values(data).returning();
      return item;
    },

    async update(
      id: string,
      userId: string,
      data: { name?: string; description?: string }
    ) {
      const [item] = await db
        .update(items)
        .set(data)
        .where(and(eq(items.id, id), eq(items.userId, userId)))
        .returning();
      return item ?? null;
    },

    async delete(id: string, userId: string) {
      await db
        .delete(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)));
    },
  };
}

export type ItemService = ReturnType<typeof createItemService>;
```

### 2. Add to create-api.ts

```typescript
// src/server/create-api.ts
import type { db as database } from "@/db";
import { createItemService, type ItemService } from "./services/item-service";

type Database = typeof database;

interface ApiDeps {
  db: Database;
}

interface Services {
  itemService: ItemService;
}

export function createApi(deps: ApiDeps) {
  const { db } = deps;

  const itemService = createItemService({ db });

  const services: Services = {
    itemService,
  };

  return { db, services };
}

export type Api = ReturnType<typeof createApi>;
```

### 3. Use in Router

```typescript
// src/server/routers/index.ts
export const appRouter = {
  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await context.itemService.getById(
        input.id,
        context.session.user.id
      );

      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Item not found" });
      }

      return item;
    }),
};
```

## Service Guidelines

1. **Keep services focused** - One service per domain entity
2. **Inject dependencies** - Pass db, other services via factory
3. **Return data, not errors** - Let routers handle error responses
4. **No request context** - Services don't know about HTTP/sessions
5. **Type exports** - Export the service type for context typing
