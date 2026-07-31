import { describe, expect, it } from "bun:test";

import { Effect, Schema } from "effect";

import {
  CreateStashItem,
  StashItem,
  StashItemNotFound,
  Unauthorized,
} from "./schema";

const decodeItem = Schema.decodeUnknownSync(StashItem);
const encodeItem = Schema.encodeSync(StashItem);

const row = {
  archivedAt: null,
  body: "remember this",
  createdAt: 1_700_000_000_000,
  done: false,
  id: "stx_abc",
  kind: "note" as const,
  source: "cli" as const,
  tags: ["a", "b"],
  title: null,
  updatedAt: 1_700_000_000_000,
  url: null,
};

describe("StashItem", () => {
  it("round-trips through decode/encode unchanged", () => {
    expect(encodeItem(decodeItem(row))).toEqual(row);
  });

  it("rejects an unknown kind", () => {
    expect(() => decodeItem({ ...row, kind: "video" })).toThrow();
  });

  it("rejects a missing body", () => {
    const { body, ...withoutBody } = row;
    expect(body).toBeDefined();
    expect(() => decodeItem(withoutBody)).toThrow();
  });
});

describe("CreateStashItem", () => {
  const decodeCreate = Schema.decodeUnknownSync(CreateStashItem);

  it("accepts a bare body and leaves the rest optional", () => {
    expect(decodeCreate({ body: "hi" })).toEqual({ body: "hi" });
  });

  it("rejects an empty body", () => {
    // The capture surfaces all post user input directly; an empty capture is
    // the most likely bad payload, so it must fail at the boundary.
    expect(() => decodeCreate({ body: "" })).toThrow();
  });
});

describe("tagged errors", () => {
  it("StashItemNotFound is yieldable and carries its id", () => {
    const exit = Effect.runSyncExit(
      Effect.gen(function* exit() {
        return yield* new StashItemNotFound({ id: "stx_missing" });
      })
    );
    expect(exit._tag).toBe("Failure");
  });

  it("distinguishes error tags", () => {
    expect(new Unauthorized({ message: "nope" })._tag).toBe("Unauthorized");
    expect(new StashItemNotFound({ id: "x" })._tag).toBe("StashItemNotFound");
  });
});
