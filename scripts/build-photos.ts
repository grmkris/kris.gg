#!/usr/bin/env bun
/**
 * Build photo variants + blur placeholders for the Editorial Field Journal.
 *
 * For each photo in public/photos/<slug>/NN.jpg, generates:
 *   <slug>/NN-400.webp   thumbnail for manifest hover preview
 *   <slug>/NN-800.webp   mid size for masonry grid
 *   <slug>/NN-1600.webp  full size for lightbox
 *
 * Writes src/content/photos.generated.json with metadata (dimensions,
 * blurDataURL, variant paths) keyed by trip slug.
 *
 * Incremental: skips variants newer than their source.
 */
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const PUBLIC_PHOTOS = "public/photos";
const OUTPUT_JSON = "src/content/photos.generated.json";
const VARIANT_WIDTHS = [400, 800, 1600] as const;
const QUALITY = 82;
const BLUR_WIDTH = 10;

interface PhotoMeta {
  src: string;
  thumb: string;
  mid: string;
  full: string;
  width: number;
  height: number;
  blur: string;
  dominant: string; // "#rrggbb" — used for lightbox page-flash transition
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

type Manifest = Record<string, PhotoMeta[]>;

function isUpToDate(src: string, dst: string): boolean {
  if (!existsSync(dst)) return false;
  return statSync(dst).mtimeMs >= statSync(src).mtimeMs;
}

async function buildPhoto(
  slug: string,
  filename: string
): Promise<PhotoMeta | null> {
  const sourcePath = join(PUBLIC_PHOTOS, slug, filename);
  const baseName = filename.replace(/\.[^.]+$/, "");
  const slugDir = join(PUBLIC_PHOTOS, slug);

  // Read source dimensions once
  const meta = await sharp(sourcePath).metadata();
  if (!meta.width || !meta.height) {
    console.warn(`  ! skip ${slug}/${filename}: no dimensions`);
    return null;
  }

  // Generate variants
  for (const width of VARIANT_WIDTHS) {
    const variantPath = join(slugDir, `${baseName}-${width}.webp`);
    if (isUpToDate(sourcePath, variantPath)) continue;
    await sharp(sourcePath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(variantPath);
  }

  // Generate blurDataURL (tiny base64 WebP)
  const blurBuffer = await sharp(sourcePath)
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();
  const blur = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  // Dominant color for the lightbox page-flash transition
  const stats = await sharp(sourcePath).stats();
  const dominant = `#${toHex(stats.dominant.r)}${toHex(stats.dominant.g)}${toHex(stats.dominant.b)}`;

  return {
    src: `/photos/${slug}/${filename}`,
    thumb: `/photos/${slug}/${baseName}-400.webp`,
    mid: `/photos/${slug}/${baseName}-800.webp`,
    full: `/photos/${slug}/${baseName}-1600.webp`,
    width: meta.width,
    height: meta.height,
    blur,
    dominant,
  };
}

async function main() {
  const start = Date.now();
  const slugs = (await readdir(PUBLIC_PHOTOS, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const manifest: Manifest = {};
  let totalPhotos = 0;
  let totalVariantsGenerated = 0;

  for (const slug of slugs) {
    const slugDir = join(PUBLIC_PHOTOS, slug);
    await mkdir(slugDir, { recursive: true });
    const files = (await readdir(slugDir))
      .filter((f) => /^\d{2}\.jpe?g$/i.test(f))
      .sort();

    if (files.length === 0) continue;

    const entries: PhotoMeta[] = [];
    for (const file of files) {
      const sourcePath = join(slugDir, file);
      const baseName = file.replace(/\.[^.]+$/, "");
      const beforeCount = VARIANT_WIDTHS.filter(
        (w) => !isUpToDate(sourcePath, join(slugDir, `${baseName}-${w}.webp`))
      ).length;
      const photo = await buildPhoto(slug, file);
      if (photo) {
        entries.push(photo);
        totalVariantsGenerated += beforeCount;
      }
    }

    if (entries.length > 0) {
      manifest[slug] = entries;
      totalPhotos += entries.length;
      console.log(`  ✓ ${slug}: ${entries.length} photos`);
    }
  }

  await writeFile(OUTPUT_JSON, JSON.stringify(manifest, null, 2) + "\n");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\nWrote ${OUTPUT_JSON} (${totalPhotos} photos across ${
      Object.keys(manifest).length
    } trips, ${totalVariantsGenerated} variants generated in ${elapsed}s)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
