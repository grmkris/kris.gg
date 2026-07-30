#!/usr/bin/env bun
/**
 * Terminal capture for the stash.
 *
 *   bun run stash "thing to remember"
 *   pbpaste | bun run stash -
 *   bun run stash --list
 *
 * Auth is STASH_API_KEY (a better-auth API key). Passkeys are interactive and
 * cannot cover a headless client.
 */

export {};

const BASE = process.env.STASH_URL ?? "https://kris.gg";
const KEY = process.env.STASH_API_KEY;

if (KEY === undefined || KEY === "") {
  console.error(
    "Missing STASH_API_KEY. Mint one from /stash, then export it (see .env.example)."
  );
  process.exit(1);
}

const request = async (
  path: string,
  init?: RequestInit
): Promise<unknown> => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": KEY,
      ...init?.headers,
    },
  });
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
  return Buffer.concat(chunks).toString("utf8");
};

const args = process.argv.slice(2);

if (args[0] === "--list" || args[0] === "-l") {
  const items = (await request("/api/stash")) as {
    body: string;
    done: boolean;
    id: string;
  }[];
  for (const item of items) {
    console.log(`${item.done ? "x" : " "}  ${item.id}  ${item.body.split("\n")[0]}`);
  }
  process.exit(0);
}

const body = args[0] === "-" ? await readStdin() : args.join(" ");

if (body.trim() === "") {
  console.error('Nothing to save. Usage: bun run stash "text" | bun run stash -');
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
