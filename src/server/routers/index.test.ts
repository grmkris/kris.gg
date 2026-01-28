import { call } from "@orpc/server";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import {
  createTestContext,
  createTestSetup,
  createUnauthenticatedContext,
  type TestSetup,
} from "@/test/setup";

import { appRouter } from "./index";

describe("appRouter", () => {
  let setup: TestSetup;

  beforeAll(async () => {
    setup = await createTestSetup();
  });

  afterAll(() => {
    setup.close();
  });

  describe("healthCheck", () => {
    it("should return OK", async () => {
      const ctx = createUnauthenticatedContext(setup);
      const result = await call(appRouter.healthCheck, {}, { context: ctx });
      expect(result).toBe("OK");
    });
  });

  describe("privateData", () => {
    it("should return private data for authenticated user", async () => {
      const ctx = createTestContext(setup);
      const result = await call(appRouter.privateData, {}, { context: ctx });
      expect(result).toHaveProperty("message", "This is private");
      expect(result).toHaveProperty("user");
      expect(result.user?.id).toBe(setup.users.authenticated.id);
    });

    it("should reject unauthenticated requests", async () => {
      const ctx = createUnauthenticatedContext(setup);
      let threw = false;
      try {
        await call(appRouter.privateData, {}, { context: ctx });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });
});
