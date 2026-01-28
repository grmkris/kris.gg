import * as schema from "@/db/schema";

import type { TestSetup } from "./setup";

interface CreateUserOptions {
  email?: string;
  emailVerified?: boolean;
  id?: string;
  name?: string;
}

export const createTestUser = async (
  setup: TestSetup,
  options: CreateUserOptions = {}
) => {
  const defaults = {
    createdAt: new Date(),
    email: `test-${Date.now()}@test.com`,
    emailVerified: true,
    id: crypto.randomUUID(),
    name: "Test User",
    updatedAt: new Date(),
  };

  const userData = { ...defaults, ...options };

  const [user] = await setup.db
    .insert(schema.user)
    .values(userData)
    .returning();

  return user;
};

// Generic helper for creating test data with overrides
export const createTestData = <T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T> = {}
): T => ({ ...defaults, ...overrides });

// Helper for generating unique identifiers
export const generateTestId = (prefix = "test"): string =>
  `${prefix}-${crypto.randomUUID()}`;

// Helper for generating unique email
export const generateTestEmail = (): string =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
