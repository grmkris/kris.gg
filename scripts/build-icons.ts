#!/usr/bin/env bun
/**
 * Generate the PWA icons in `public/`.
 *
 *   bun run scripts/build-icons.ts
 *
 * `src/app/icon.tsx` and `apple-icon.tsx` render their marks on demand through
 * `next/og`, which is right for a favicon but wrong for a manifest: an installer
 * fetches these once, at install time, and wants concrete files at stable paths.
 *
 * A one-off, like `scripts/build-portrait.ts` — re-run it only if the mark
 * changes. Output is committed.
 *
 * The maskable variant carries the same mark inside the safe zone (the middle
 * 80%), because Android crops icons to the launcher's own shape and a
 * full-bleed mark loses its corners.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const OUT_DIR = "public";
const BACKGROUND = "#0a0a0a";
const FOREGROUND = "#f4ede1";

/**
 * @param scale fraction of the canvas the mark occupies — 1 for a normal icon,
 *   0.8 for maskable, so a launcher's crop cannot clip it.
 */
const mark = (size: number, scale: number): string => {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.56 * scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BACKGROUND}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="${fontSize}" font-weight="700" fill="${FOREGROUND}">K</text>
</svg>`;
};

const icons = [
  { name: "icon-192.png", scale: 1, size: 192 },
  { name: "icon-512.png", scale: 1, size: 512 },
  { name: "icon-maskable-512.png", scale: 0.8, size: 512 },
] as const;

for (const icon of icons) {
  const png = await sharp(Buffer.from(mark(icon.size, icon.scale)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(OUT_DIR, icon.name), png);
  console.log(`  ✓ ${OUT_DIR}/${icon.name} (${png.length} bytes)`);
}
