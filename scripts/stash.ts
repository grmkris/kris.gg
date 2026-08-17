#!/usr/bin/env bun
/**
 * Terminal capture for the stash.
 *
 *   bun run stash "thing to remember"
 *   pbpaste | bun run stash -
 *   bun run stash --file shot.png ["optional caption"]
 *   bun run stash --list
 *
 * Auth is STASH_API_KEY (a better-auth API key). Passkeys are interactive and
 * cannot cover a headless client.
 */

// Also what makes this file a module, so the top-level `await`s below are legal.
import { Buffer } from "node:buffer";

const BASE = process.env.STASH_URL ?? "https://kris.gg";
const KEY = process.env.STASH_API_KEY;

if (KEY === undefined || KEY === "") {
  console.error(
    "Missing STASH_API_KEY. Mint one from /stash, then export it (see .env.example)."
  );
  process.exit(1);
}

const request = async (path: string, init?: RequestInit): Promise<unknown> => {
  // Merged through `Headers` rather than by spreading: `HeadersInit` may be an
  // array of pairs, which spreads into numeric keys instead of headers.
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-api-key": KEY,
  });
  for (const [name, value] of new Headers(init?.headers)) {
    headers.set(name, value);
  }

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    console.error(`${response.status} ${await response.text()}`);
    process.exit(1);
  }
  return await response.json();
};

const readStdin = async (): Promise<string> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

const args = process.argv.slice(2);

if (args[0] === "--list" || args[0] === "-l") {
  const items = (await request("/api/stash")) as {
    body: string;
    done: boolean;
    id: string;
  }[];
  for (const item of items) {
    console.log(
      `${item.done ? "x" : " "}  ${item.id}  ${item.body.split("\n")[0]}`
    );
  }
  process.exit(0);
}

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Attach an image. Unlike the browser there is no canvas here to downscale
 * with, so the file goes up as-is — which is fine for a screenshot and the
 * reason the server still enforces a size ceiling.
 */
if (args[0] === "--file" || args[0] === "-f") {
  const path = args[1];
  if (path === undefined) {
    console.error('Usage: bun run stash --file shot.png ["caption"]');
    process.exit(1);
  }

  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`No such file: ${path}`);
    process.exit(1);
  }

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (contentType === undefined) {
    console.error(
      `Unsupported image type ".${extension}". Allowed: ${Object.keys(CONTENT_TYPES).join(", ")}.`
    );
    process.exit(1);
  }

  const bytes = await file.arrayBuffer();
  // Real dimensions, so the lightbox can size the slide before the image
  // loads. sharp is a devDependency and this script only ever runs locally.
  const { default: sharp } = await import("sharp");
  const meta = await sharp(Buffer.from(bytes)).metadata();
  const ticket = (await request("/api/stash/upload", {
    body: JSON.stringify({ bytes: bytes.byteLength, contentType }),
    method: "POST",
  })) as { key: string; uploadUrl: string };

  const upload = await fetch(ticket.uploadUrl, {
    body: bytes,
    headers: { "Content-Type": contentType },
    method: "PUT",
  });
  if (!upload.ok) {
    console.error(`Upload failed: ${upload.status} ${await upload.text()}`);
    process.exit(1);
  }

  await request("/api/stash", {
    body: JSON.stringify({
      attachments: [
        {
          bytes: bytes.byteLength,
          contentType,
          height: meta.height ?? 0,
          key: ticket.key,
          width: meta.width ?? 0,
        },
      ],
      body: args.slice(2).join(" "),
      kind: "image" as const,
      source: "cli" as const,
    }),
    method: "POST",
  });

  console.log("stashed");
  process.exit(0);
}

const body = args[0] === "-" ? await readStdin() : args.join(" ");

if (body.trim() === "") {
  console.error(
    'Nothing to save. Usage: bun run stash "text" | bun run stash - | bun run stash --file shot.png'
  );
  process.exit(1);
}

const trimmed = body.trim();
const isUrl = /^https?:\/\/\S+$/.test(trimmed);

await request("/api/stash", {
  body: JSON.stringify({
    body: trimmed,
    kind: isUrl ? ("link" as const) : ("note" as const),
    source: "cli" as const,
    ...(isUrl ? { url: trimmed } : {}),
  }),
  method: "POST",
});

console.log("stashed");
