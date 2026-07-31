"use client";

/**
 * Turning a pasted or dropped file into an uploaded attachment.
 *
 * Resizing happens **here**, in a canvas, rather than server-side: a serverless
 * function would have to receive the full-size bytes first, which is the cost
 * this whole path exists to avoid — and it would put `sharp` on the request
 * path. The browser already has the decoded image in memory.
 *
 * The upload itself goes straight to R2 through a presigned PUT
 * (`src/stash/media.ts`), so the bytes never touch Vercel.
 */

import { getApi, runApi } from "@/lib/api/runtime";
import type { NewStashAttachment } from "@/stash/schema";

/** Beyond this, detail is invisible in a triage list and costs upload time. */
const MAX_EDGE = 1600;
/** Enough to suggest the image, small enough to inline in the row payload. */
const PLACEHOLDER_EDGE = 16;
const QUALITY = 0.82;

export const isSupportedImage = (type: string): boolean =>
  ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(
    type
  );

/**
 * `OffscreenCanvas` rather than a DOM canvas: `convertToBlob` is promise-based,
 * where `HTMLCanvasElement.toBlob` is callback-only, and nothing here needs to
 * be in the document.
 */
const drawTo = (
  source: ImageBitmap,
  width: number,
  height: number
): OffscreenCanvas => {
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(width)),
    Math.max(1, Math.round(height))
  );
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas 2D context unavailable");
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const toBlob = async (canvas: OffscreenCanvas, type: string): Promise<Blob> =>
  await canvas.convertToBlob({ quality: QUALITY, type });

/** Base64 without a FileReader — the bytes are already in hand. */
const toDataUri = async (canvas: OffscreenCanvas): Promise<string> => {
  const blob = await canvas.convertToBlob({ quality: 0.5, type: "image/webp" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return `data:image/webp;base64,${btoa(binary)}`;
};

export interface PreparedImage {
  readonly blob: Blob;
  readonly contentType: string;
  readonly width: number;
  readonly height: number;
  readonly placeholder: string;
  /** Object URL for the optimistic preview. Revoke it once uploaded. */
  readonly previewUrl: string;
}

/**
 * Decode, downscale and derive a placeholder — all before anything leaves the
 * browser, so the preview is instant and the upload is small.
 *
 * Animated GIFs are passed through untouched: a canvas would flatten them to
 * their first frame.
 */
export const prepareImage = async (file: File): Promise<PreparedImage> => {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const passthrough = file.type === "image/gif" || scale === 1;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    // WebP everywhere except GIF, which would lose its animation.
    const contentType = passthrough ? file.type : "image/webp";
    const blob = passthrough
      ? file
      : await toBlob(drawTo(bitmap, width, height), contentType);

    const placeholderScale =
      PLACEHOLDER_EDGE / Math.max(bitmap.width, bitmap.height);
    const placeholder = await toDataUri(
      drawTo(
        bitmap,
        bitmap.width * placeholderScale,
        bitmap.height * placeholderScale
      )
    );

    return {
      blob,
      contentType,
      height: passthrough ? bitmap.height : height,
      placeholder,
      previewUrl: URL.createObjectURL(blob),
      width: passthrough ? bitmap.width : width,
    };
  } finally {
    bitmap.close();
  }
};

/**
 * Ask the API where to put it, PUT it there, and hand back the attachment
 * record to send with `create`.
 */
export const uploadImage = async (
  image: PreparedImage
): Promise<NewStashAttachment> => {
  const api = await getApi();
  const ticket = await runApi(
    api.stash.upload({
      payload: { bytes: image.blob.size, contentType: image.contentType },
    })
  );

  const response = await fetch(ticket.uploadUrl, {
    body: image.blob,
    headers: { "Content-Type": image.contentType },
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return {
    bytes: image.blob.size,
    contentType: image.contentType,
    height: image.height,
    key: ticket.key,
    placeholder: image.placeholder,
    width: image.width,
  };
};

/** Every image on a clipboard or drop event, ignoring anything else. */
export const imageFilesFrom = (data: DataTransfer | null): readonly File[] => {
  if (data === null) {
    return [];
  }
  return [...data.files].filter((file) => isSupportedImage(file.type));
};
