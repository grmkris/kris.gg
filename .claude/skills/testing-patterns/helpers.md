# Test Helper Patterns

## Creating Test Data

```typescript
// src/test/helpers.ts
import type { TestSetup } from "./setup";
import * as schema from "@/db/schema";

// Create test user
export async function createTestUser(
  setup: TestSetup,
  options: Partial<{
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  }> = {}
) {
  const defaults = {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@test.com`,
    name: "Test User",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userData = { ...defaults, ...options };

  const [user] = await setup.db
    .insert(schema.user)
    .values(userData)
    .returning();

  return user;
}
```

## Item Helper Example

```typescript
interface CreateItemOptions {
  id?: string;
  name?: string;
  description?: string;
  userId?: string;
  status?: "draft" | "active" | "archived";
}

export async function createTestItem(
  setup: TestSetup,
  options: CreateItemOptions = {}
) {
  const defaults = {
    id: crypto.randomUUID(),
    name: `Test Item ${Date.now()}`,
    description: null,
    userId: setup.users.authenticated.id,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const itemData = { ...defaults, ...options };

  const [item] = await setup.db
    .insert(schema.items)
    .values(itemData)
    .returning();

  return item;
}
```

## Usage in Tests

```typescript
import { createTestItem, createTestUser } from "@/test/helpers";

it("should update an item", async () => {
  // Arrange
  const item = await createTestItem(setup, { name: "Original Name" });

  // Act
  const ctx = createTestContext(setup);
  const result = await call(
    appRouter.updateItem,
    { id: item.id, name: "Updated Name" },
    { context: ctx }
  );

  // Assert
  expect(result.name).toBe("Updated Name");
});

it("should not update other user's item", async () => {
  const otherUser = await createTestUser(setup, { email: "other@test.com" });
  const item = await createTestItem(setup, { userId: otherUser.id });

  const ctx = createTestContext(setup);

  await expect(
    call(
      appRouter.updateItem,
      { id: item.id, name: "Hacked" },
      { context: ctx }
    )
  ).rejects.toThrow("NOT_FOUND");
});
```

## Generator Helpers

```typescript
// Generate unique test email
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

// Generate unique test ID with prefix
export function generateTestId(prefix = "test"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// Create multiple items at once
export async function createTestItems(
  setup: TestSetup,
  count: number,
  options: Partial<CreateItemOptions> = {}
) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = await createTestItem(setup, {
      ...options,
      name: `${options.name || "Item"} ${i + 1}`,
    });
    items.push(item);
  }
  return items;
}
```

## Cleanup Between Tests

```typescript
describe("items", () => {
  let setup: TestSetup;

  beforeAll(async () => {
    setup = await createTestSetup();
  });

  afterAll(() => setup.close());

  // Clean up after each test to ensure isolation
  afterEach(async () => {
    await setup.cleanup();
    // Re-create the authenticated user since cleanup truncates all tables
    await setup.db.insert(schema.user).values({
      id: setup.users.authenticated.id,
      email: setup.users.authenticated.email,
      name: setup.users.authenticated.name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("test 1...", async () => {});
  it("test 2...", async () => {});
});
```
