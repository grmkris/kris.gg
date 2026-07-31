import { describe, expect, it } from "bun:test";

import { Effect, Schema } from "effect";

import {
  CreateStashItem,
  StashItem,
  StashItemNotFound,
  Unauthorized,
  UploadRequest,
} from "./schema";

const decodeItem = Schema.decodeUnknownSync(StashItem);
const encodeItem = Schema.encodeSync(StashItem);

const row = {
  archivedAt: null,
  attachments: [],
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

describe("StashAttachment", () => {
  const attachment = {
    bytes: 40_213,
    contentType: "image/webp",
    height: 900,
    key: "user-1/abc.webp",
    placeholder: "data:image/webp;base64,AAAA",
    url: "https://example.invalid/signed",
    width: 1600,
  };

  it("round-trips on an item", () => {
    const withImage = {
      ...row,
      attachments: [attachment],
      kind: "image" as const,
    };
    expect(encodeItem(decodeItem(withImage))).toEqual(withImage);
  });

  it("accepts a null placeholder", () => {
    const withImage = {
      ...row,
      attachments: [{ ...attachment, placeholder: null }],
    };
    expect(decodeItem(withImage).attachments[0]?.placeholder).toBeNull();
  });

  it("rejects an attachment missing its key", () => {
    const { key, ...withoutKey } = attachment;
    expect(key).toBeDefined();
    expect(() => decodeItem({ ...row, attachments: [withoutKey] })).toThrow();
  });
});

describe("UploadRequest", () => {
  const decodeUpload = Schema.decodeUnknownSync(UploadRequest);

  it("requires a content type and a size", () => {
    expect(decodeUpload({ bytes: 1234, contentType: "image/png" })).toEqual({
      bytes: 1234,
      contentType: "image/png",
    });
  });

  it("rejects an empty content type", () => {
    expect(() => decodeUpload({ bytes: 1, contentType: "" })).toThrow();
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

  it("accepts an empty body when an image is attached", () => {
    // An image on its own is a capture — that is the whole point of paste.
    expect(() =>
      decodeCreate({
        attachments: [
          {
            bytes: 10,
            contentType: "image/webp",
            height: 2,
            key: "u/1.webp",
            width: 2,
          },
        ],
        body: "",
      })
    ).not.toThrow();
  });

  it("still rejects an empty body with no attachments", () => {
    expect(() => decodeCreate({ attachments: [], body: "   " })).toThrow();
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
