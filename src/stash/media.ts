import "server-only";
/**
 * Stash attachments on Cloudflare R2.
 *
 * The browser uploads **straight to R2** through a presigned PUT rather than
 * posting bytes through a Vercel function: no request-body ceiling, no Vercel
 * bandwidth, and the image never touches the serverless path. Reads work the
 * same way in reverse — the bucket stays private and `list` hands out short-TTL
 * presigned GETs.
 *
 * Signing is `aws4fetch` (~4KB, built for R2). `Bun.S3Client`, which the photo
 * pipeline uses, is unavailable here: that runs locally, this runs on Vercel's
 * Node runtime.
 *
 * The S3 credentials are derived from an R2 API token — the Access Key ID is
 * the token's id and the secret is `sha256(token value)`. Both are stored as
 * plain env vars; nothing here re-derives them.
 */
import { AwsClient } from "aws4fetch";

/** Long enough to open a stash and click into a few images. */
const READ_TTL_SECONDS = 60 * 30;
/** Short: the client uploads the moment it receives the URL. */
const WRITE_TTL_SECONDS = 60 * 5;

/** Nothing else is worth accepting from a paste buffer. */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/**
 * 10 MB. The client downscales before upload, so anything larger is a mistake
 * rather than a photo.
 */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing ${name}. Stash media needs R2_STASH_BUCKET, R2_STASH_ACCESS_KEY_ID and R2_STASH_SECRET_ACCESS_KEY.`
    );
  }
  return value;
};

let cached: { bucketUrl: string; client: AwsClient } | undefined;

const r2 = (): { bucketUrl: string; client: AwsClient } => {
  cached ??= {
    bucketUrl: `https://${required("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com/${required("R2_STASH_BUCKET")}`,
    client: new AwsClient({
      accessKeyId: required("R2_STASH_ACCESS_KEY_ID"),
      region: "auto",
      secretAccessKey: required("R2_STASH_SECRET_ACCESS_KEY"),
      service: "s3",
    }),
  };
  return cached;
};

/**
 * Object keys are namespaced per user so a leaked key cannot be walked into
 * someone else's attachments, and carry a random suffix so the same image
 * pasted twice does not collide.
 */
export const attachmentKey = (userId: string, contentType: string): string => {
  const extension = contentType.split("/")[1]?.replace("+xml", "") ?? "bin";
  return `${userId}/${Date.now().toString(36)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}.${extension}`;
};

const presign = async (
  key: string,
  method: "GET" | "PUT",
  ttlSeconds: number
): Promise<string> => {
  const { bucketUrl, client } = r2();
  const url = new URL(`${bucketUrl}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));
  const signed = await client.sign(new Request(url, { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
};

/** A URL the browser can `PUT` the bytes to, with no credentials of its own. */
export const presignUpload = async (key: string): Promise<string> =>
  await presign(key, "PUT", WRITE_TTL_SECONDS);

/** A URL the browser can render an `<img src>` from, expiring shortly after. */
export const presignRead = async (key: string): Promise<string> =>
  await presign(key, "GET", READ_TTL_SECONDS);

/**
 * Best-effort delete when an item is removed. A failure here leaks an object
 * rather than breaking the delete, so it never propagates — the row going away
 * is what the user asked for.
 */
export const deleteAttachments = async (
  keys: readonly string[]
): Promise<void> => {
  const { bucketUrl, client } = r2();
  await Promise.all(
    keys.map(async (key) => {
      try {
        await client.fetch(`${bucketUrl}/${key}`, { method: "DELETE" });
      } catch {
        // Orphaned object; the row is gone, which is the part that matters.
      }
    })
  );
};
