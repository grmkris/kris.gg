#!/usr/bin/env bun
import { S3Client } from "bun";
/**
 * Stage: publish — encode webp variants, upload variants + source JPGs to
 * Cloudflare R2, and write src/content/photos.generated.json with absolute R2
 * URLs. This replaces the build-time `build-photos` step: image work now happens
 * locally (like `photos:place`), the Vercel build does zero encoding, and the
 * binaries live on R2 + locally rather than in git.
 *
 *   bun run photos:publish [--force]
 *
 * Reads credentials from .env.r2.local (gitignored). Uploads are content-hash
 * keyed (NN.<hash>-<width>.webp) and skipped if the object already exists, so
 * re-runs only touch new/changed photos. --force re-uploads everything.
 *
 * Conventions match scripts/build-photos.ts (relative paths, "  ✓ slug" logs).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_PHOTOS = "public/photos";
const OUTPUT_JSON = "src/content/photos.generated.json";
const ENV_FILE = ".env.r2.local";
const VARIANT_WIDTHS = [400, 800, 1600] as const;
const QUALITY = 82;
const BLUR_WIDTH = 10;
const CONCURRENCY = 12;
const NN_JPG = /^\d{2}\.jpe?g$/i;

interface PhotoMeta {
  id: string; // stable 8-hex content hash — per-photo permalink id
  src: string;
  thumb: string;
  mid: string;
  full: string;
  width: number;
  height: number;
  blur: string;
  dominant: string; // "#rrggbb" — lightbox page-flash transition
}

type Manifest = Record<string, PhotoMeta[]>;

/** Minimal KEY=VALUE loader for the gitignored R2 env file. */
function loadEnv(path: string): void {
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Create it with R2_BUCKET, R2_S3_ENDPOINT, R2_PUBLIC_BASE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.`
    );
  }
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Missing env ${key} (set it in ${ENV_FILE}).`);
  }
  return v;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

/** Run `fn` over `items` with bounded concurrency, preserving input order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

let uploaded = 0;
let skipped = 0;

async function putIfAbsent(
  s3: S3Client,
  key: string,
  data: Buffer | Uint8Array,
  type: string,
  force: boolean
): Promise<void> {
  if (!force && (await s3.exists(key))) {
    skipped++;
    return;
  }
  await s3.write(key, data, { type });
  uploaded++;
}

async function publishPhoto(
  s3: S3Client,
  publicBase: string,
  slug: string,
  filename: string,
  force: boolean
): Promise<PhotoMeta | null> {
  const sourcePath = join(PUBLIC_PHOTOS, slug, filename);
  const baseName = filename.replace(/\.[^.]+$/, "");
  const bytes = readFileSync(sourcePath);

  const meta = await sharp(bytes).metadata();
  if (!(meta.width && meta.height)) {
    console.warn(`  ! skip ${slug}/${filename}: no dimensions`);
    return null;
  }

  const v = createHash("sha1").update(bytes).digest("hex").slice(0, 8);

  // Variants — content-hash keyed, immutable.
  for (const width of VARIANT_WIDTHS) {
    const key = `photos/${slug}/${baseName}.${v}-${width}.webp`;
    if (!force && (await s3.exists(key))) {
      skipped++;
      continue;
    }
    const buf = await sharp(bytes)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    await s3.write(key, buf, { type: "image/webp" });
    uploaded++;
  }

  // Source JPG — needed by OG cards (decoded → JPEG for Satori at build).
  await putIfAbsent(
    s3,
    `photos/${slug}/${filename}`,
    bytes,
    "image/jpeg",
    force
  );

  // Blur placeholder (inlined base64) + dominant color.
  const blurBuffer = await sharp(bytes)
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();
  const blur = `data:image/webp;base64,${blurBuffer.toString("base64")}`;
  const stats = await sharp(bytes).stats();
  const dominant = `#${toHex(stats.dominant.r)}${toHex(stats.dominant.g)}${toHex(stats.dominant.b)}`;

  const url = (key: string) => `${publicBase}/${key}`;
  return {
    blur,
    dominant,
    full: url(`photos/${slug}/${baseName}.${v}-1600.webp`),
    height: meta.height,
    id: v,
    mid: url(`photos/${slug}/${baseName}.${v}-800.webp`),
    src: url(`photos/${slug}/${filename}`),
    thumb: url(`photos/${slug}/${baseName}.${v}-400.webp`),
    width: meta.width,
  };
}

async function main(): Promise<void> {
  const start = Date.now();
  loadEnv(ENV_FILE);
  const force = process.argv.includes("--force");

  const publicBase = requireEnv("R2_PUBLIC_BASE").replace(/\/+$/, "");
  const s3 = new S3Client({
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    bucket: requireEnv("R2_BUCKET"),
    endpoint: requireEnv("R2_S3_ENDPOINT"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  });

  const slugs = (await readdir(PUBLIC_PHOTOS, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .toSorted();

  // Flatten to (slug, file) tasks so the concurrency pool saturates across trips.
  const tasks: { slug: string; file: string }[] = [];
  for (const slug of slugs) {
    const files = (await readdir(join(PUBLIC_PHOTOS, slug)))
      .filter((f) => NN_JPG.test(f))
      .toSorted();
    for (const file of files) {
      tasks.push({ file, slug });
    }
  }

  console.log(
    `Publishing ${tasks.length} photos across ${slugs.length} trips to ${publicBase} …`
  );

  const metas = await mapPool(tasks, CONCURRENCY, (t) =>
    publishPhoto(s3, publicBase, t.slug, t.file, force)
  );

  const manifest: Manifest = {};
  tasks.forEach((t, i) => {
    const meta = metas[i];
    if (meta) {
      (manifest[t.slug] ??= []).push(meta);
    }
  });

  await writeFile(OUTPUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\nWrote ${OUTPUT_JSON} — ${Object.keys(manifest).length} trips, ${tasks.length} photos. ` +
      `Uploaded ${uploaded} objects, skipped ${skipped} (already on R2). ${elapsed}s`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
