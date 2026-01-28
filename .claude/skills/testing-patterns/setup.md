# Test Setup Patterns

## Basic Test Structure

```typescript
// src/server/routers/items.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { call } from "@orpc/server";
import {
  createTestSetup,
  createTestContext,
  type TestSetup,
} from "@/test/setup";
import { appRouter } from "./index";

describe("items router", () => {
  let setup: TestSetup;

  beforeAll(async () => {
    setup = await createTestSetup();
  });

  afterAll(() => {
    setup.close();
  });

  it("should list items", async () => {
    const ctx = createTestContext(setup);
    const result = await call(appRouter.listItems, {}, { context: ctx });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create an item", async () => {
    const ctx = createTestContext(setup);
    const result = await call(
      appRouter.createItem,
      { name: "Test Item" },
      { context: ctx }
    );
    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Item");
  });
});
```

## TestSetup Interface

```typescript
interface TestSetup {
  db: Database; // Drizzle database instance
  sqlite: Database; // Raw bun:sqlite instance
  api: Api; // API with services
  users: {
    authenticated: TestUser; // Pre-created test user
  };
  cleanup: () => Promise<void>; // Truncate tables
  close: () => void; // Close DB connection
}

interface TestUser {
  id: string;
  email: string;
  name: string;
}
```

## Creating Test Context

```typescript
// Authenticated context (has session)
const ctx = createTestContext(setup);
// ctx.session.user is available

// Unauthenticated context (no session)
const ctx = createUnauthenticatedContext(setup);
// ctx.session is null
```

## Testing Protected Routes

```typescript
import { call } from "@orpc/server";
import { createUnauthenticatedContext } from "@/test/setup";

it("should reject unauthenticated requests", async () => {
  const ctx = createUnauthenticatedContext(setup);

  await expect(call(appRouter.listItems, {}, { context: ctx })).rejects.toThrow(
    "UNAUTHORIZED"
  );
});
```

## Testing Error Cases

```typescript
it("should throw NOT_FOUND for non-existent item", async () => {
  const ctx = createTestContext(setup);

  await expect(
    call(appRouter.getItem, { id: "non-existent-id" }, { context: ctx })
  ).rejects.toThrow("NOT_FOUND");
});
```

## Testing with Database Data

```typescript
import { createTestUser } from "@/test/helpers";
import * as schema from "@/db/schema";

it("should list user's items only", async () => {
  // Create another user
  const otherUser = await createTestUser(setup, {
    email: "other@test.com",
  });

  // Create item for other user
  await setup.db.insert(schema.items).values({
    id: crypto.randomUUID(),
    name: "Other User Item",
    userId: otherUser.id,
  });

  // Create item for authenticated user
  await setup.db.insert(schema.items).values({
    id: crypto.randomUUID(),
    name: "My Item",
    userId: setup.users.authenticated.id,
  });

  const ctx = createTestContext(setup);
  const result = await call(appRouter.listItems, {}, { context: ctx });

  // Should only see own items
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe("My Item");
});
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/server/routers/items.test.ts

# Run with watch mode
bun test --watch

# Run tests matching pattern
bun test --grep "items"
```
