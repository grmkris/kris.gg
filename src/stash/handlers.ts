/**
 * `StashGroup` implementation. Handlers stay thin — ownership and error mapping
 * live in `StashStore`, auth in `StashAuth`, object storage in `media.ts`.
 *
 * Presigning happens here rather than in the store: the store's job is rows,
 * and a presigned URL is a per-response credential, not part of the record.
 */

import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { KrisApi } from "@/lib/api/contract";

import {
  ALLOWED_IMAGE_TYPES,
  attachmentKey,
  deleteAttachments,
  MAX_ATTACHMENT_BYTES,
  presignRead,
  presignUpload,
} from "./media";
import { CurrentUser } from "./middleware";
import {
  StashAttachment,
  StashItem,
  UploadRejected,
  UploadTicket,
} from "./schema";
import type { StashItemId } from "./schema";
import { StashStore } from "./store";

/**
 * Mint a fresh read URL for every attachment. The bucket is private, so this is
 * the only way the browser can render them — and why the URLs differ between
 * responses.
 */
const withMediaUrls = (item: StashItem): Effect.Effect<StashItem> =>
  item.attachments.length === 0
    ? Effect.succeed(item)
    : Effect.promise(async () => {
        const attachments = await Promise.all(
          item.attachments.map(
            async (attachment) =>
              // Built out field by field rather than spread: `StashAttachment`
              // is a Schema.Class, and a spread would hand back a plain object
              // still typed as one.
              new StashAttachment({
                bytes: attachment.bytes,
                contentType: attachment.contentType,
                height: attachment.height,
                key: attachment.key,
                placeholder: attachment.placeholder,
                url: await presignRead(attachment.key),
                width: attachment.width,
              })
          )
        );
        return new StashItem({
          // oxlint-disable-next-line typescript/no-misused-spread -- rebuilt into the class
          ...item,
          attachments,
        });
      });

export const StashGroupLayer = HttpApiBuilder.group(
  KrisApi,
  "stash",
  (handlers) =>
    Effect.gen(function* () {
      const store = yield* StashStore;

      return handlers
        .handle("list", () =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            const items = yield* store.list(userId);
            return yield* Effect.forEach(items, (item) => withMediaUrls(item));
          })
        )
        .handle("create", ({ payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            const created = yield* store.create(userId, payload);
            return yield* withMediaUrls(created);
          })
        )
        .handle("upload", ({ payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;

            // Validate before signing. A presigned URL is a capability, and
            // there is no second chance to inspect the bytes once it is issued.
            const allowed: readonly string[] = ALLOWED_IMAGE_TYPES;
            if (!allowed.includes(payload.contentType)) {
              return yield* new UploadRejected({
                message: `Unsupported type ${payload.contentType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
              });
            }
            if (payload.bytes <= 0 || payload.bytes > MAX_ATTACHMENT_BYTES) {
              return yield* new UploadRejected({
                message: `Attachment must be between 1 byte and ${MAX_ATTACHMENT_BYTES} bytes.`,
              });
            }

            const key = attachmentKey(userId, payload.contentType);
            const uploadUrl = yield* Effect.promise(
              async () => await presignUpload(key)
            );
            return new UploadTicket({ key, uploadUrl });
          })
        )
        .handle("update", ({ params, payload }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            const updated = yield* store.update(
              userId,
              params.id as StashItemId,
              payload
            );
            return yield* withMediaUrls(updated);
          })
        )
        .handle("remove", ({ params }) =>
          Effect.gen(function* () {
            const { userId } = yield* CurrentUser;
            const keys = yield* store.remove(userId, params.id as StashItemId);
            // Best effort: the row is already gone, and a failed object delete
            // must not turn a successful delete into an error.
            yield* Effect.promise(async () => await deleteAttachments(keys));
            return { ok: true } as const;
          })
        );
    })
);
