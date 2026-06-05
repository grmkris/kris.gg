#!/usr/bin/env bun
import { existsSync } from "node:fs";
/**
 * Stage 4 — place: commit the selected winners ADDITIVELY as public/photos/
 * <slug>/NN.jpg (next index, never overwrite/delete), then regenerate
 * photos.generated.json via build-photos. A placed.json ledger makes re-runs safe.
 *
 *   bun run photos:place <slug>              local-first: full-res for local
 *                                            originals, ≤1024px preview fallback
 *                                            for iCloud-only ones
 *   bun run photos:place <slug> --download   also attempt the (slow) iCloud
 *                                            fetch for iCloud-only originals
 *   bun run photos:place <slug> --from-cache everything from the ≤1024px previews
 *
 * Videos are local-first (chosen frame extracted from a downloaded clip);
 * iCloud video download is never auto-triggered.
 */
import { copyFile } from "node:fs/promises";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  cachePaths,
  ensureVideo,
  extractFrame,
  getTrip,
  log,
  nextIndex,
  osxphotos,
  pad2,
  parseArgs,
  PUBLIC_PHOTOS,
  readJson,
  requireSlug,
  writeJson,
} from "./shared";

interface Selection {
  slug: string;
  savedAt: string;
  uuids: string[];
  frames?: Record<string, number>;
}

interface ScoredLite {
  uuid: string;
  kind?: "photo" | "video";
  duration?: number;
}

/** Map a stage file to its uuid, preferring edited > original (skip preview). */
function pickByUuid(files: string[]): Map<string, string> {
  const best = new Map<string, { file: string; priority: number }>();
  for (const file of files) {
    const match = /^(.+?)(?:_(edited|preview))?\.jpe?g$/i.exec(file);
    if (!match) {
      continue;
    }
    const kind = match[2]?.toLowerCase();
    const priority = kind === "edited" ? 3 : (kind === "preview" ? 1 : 2);
    const current = best.get(match[1]);
    if (!current || priority > current.priority) {
      best.set(match[1], { file, priority });
    }
  }
  return new Map([...best].map(([uuid, v]) => [uuid, v.file]));
}

const PHOTO_JPEG = [
  "--skip-live",
  "--convert-to-jpeg",
  "--jpeg-quality",
  "0.9",
  "--filename",
  "{uuid}",
];

/** Export LOCAL full-res originals (no iCloud) — instant. Returns uuid→file. */
async function exportLocal(
  stageDir: string,
  winnersFile: string,
  uuids: string[]
): Promise<Map<string, string>> {
  await writeFile(winnersFile, `${uuids.join("\n")}\n`);
  await osxphotos(
    ["export", stageDir, "--uuid-from-file", winnersFile, ...PHOTO_JPEG],
    { timeoutMs: 60_000 }
  );
  return pickByUuid(await readdir(stageDir));
}

/**
 * Download one iCloud original at full-res, in its own dir + process (fresh
 * osxphotos db, isolated timeout) so one slow/stalled item can't block the
 * others. Returns the exported file path, or null on timeout/failure.
 *
 * Uses osxphotos' default --download-missing (which drives Photos.app's own
 * export to pull the original). NOTE: `--use-photokit` is deliberately NOT used
 * — on this Mac PhotoKit downloads silently return 0 bytes, while the Photos.app
 * export path works reliably (just slower, ~1-3 min/photo).
 */
async function downloadOne(
  baseDir: string,
  uuid: string
): Promise<string | null> {
  const dir = join(baseDir, uuid);
  await mkdir(dir, { recursive: true });
  await osxphotos(
    ["export", dir, "--uuid", uuid, "--download-missing", ...PHOTO_JPEG],
    { timeoutMs: 240_000 }
  );
  const file = pickByUuid(await readdir(dir)).get(uuid);
  return file ? join(dir, file) : null;
}

async function main(): Promise<void> {
  const { slug: rawSlug, flags } = parseArgs();
  const slug = requireSlug(rawSlug, "photos:place");
  getTrip(slug); // validate
  const fromCache = Boolean(flags["from-cache"]);
  const download = Boolean(flags.download);
  const paths = cachePaths(slug);

  const selection = await readJson<Selection | null>(paths.selectionJson, null);
  if (!selection || selection.uuids.length === 0) {
    throw new Error(
      `No selection — run \`bun run photos:review ${slug}\` and save first.`
    );
  }

  // Skip uuids already placed in a prior run (additive idempotency).
  const placed = await readJson<string[]>(paths.placedJson, []);
  const placedSet = new Set(placed);
  const winners = selection.uuids.filter((u) => !placedSet.has(u));
  if (winners.length === 0) {
    log(
      `  ✓ ${slug}: all ${selection.uuids.length} selected photos already placed`
    );
    return;
  }

  log(
    `placing ${slug}: ${winners.length} new photos (of ${selection.uuids.length} selected)`
  );

  // Classify winners by kind (from scored.json).
  const scored = await readJson<ScoredLite[]>(paths.scoredJson, []);
  const meta = new Map(scored.map((s) => [s.uuid, s]));
  const isVideo = (u: string) => meta.get(u)?.kind === "video";

  const stageDir = join(paths.root, "_stage");
  await rm(stageDir, { force: true, recursive: true });
  await mkdir(stageDir, { recursive: true });

  // Resolve one source JPEG per winner → sources.get(uuid). Track which fell
  // back to the ≤1024px preview (vs a full-res original/frame).
  const sources = new Map<string, string>();
  const previewUuids = new Set<string>();
  const cacheSrc = (uuid: string) => join(paths.candidatesDir, `${uuid}.jpg`);

  if (fromCache) {
    log("  --from-cache: committing local previews (≤1024px), no iCloud fetch");
    for (const uuid of winners) {
      if (existsSync(cacheSrc(uuid))) {
        sources.set(uuid, cacheSrc(uuid));
        previewUuids.add(uuid);
      }
    }
  } else {
    // Photos. Pass 1: LOCAL originals — instant full-res, never hangs.
    const photoWinners = winners.filter((u) => !isVideo(u));
    if (photoWinners.length > 0) {
      const localDir = join(stageDir, "local");
      await mkdir(localDir, { recursive: true });
      log(`  exporting ${photoWinners.length} photos full-res (local)…`);
      const local = await exportLocal(
        localDir,
        join(paths.root, "winners.txt"),
        photoWinners
      );
      for (const [uuid, file] of local) {
        sources.set(uuid, join(localDir, file));
      }
      // Pass 2 (--download): fetch the still-missing ONE AT A TIME so one slow
      // iCloud item can't stall the rest.
      const stillMissing = photoWinners.filter((u) => !sources.has(u));
      if (download && stillMissing.length > 0) {
        const dlDir = join(stageDir, "dl");
        for (let i = 0; i < stillMissing.length; i++) {
          const uuid = stillMissing[i];
          log(
            `  downloading ${i + 1}/${stillMissing.length} ${uuid.slice(0, 8)}…`
          );
          const file = await downloadOne(dlDir, uuid);
          if (file) {
            sources.set(uuid, file);
          }
        }
      }
    }
    // Videos (local-first): extract the chosen frame full-res from a local clip.
    for (const uuid of winners.filter((u) => isVideo(u))) {
      const video = await ensureVideo(slug, uuid);
      if (!video) {
        continue;
      }
      const t = selection.frames?.[uuid] ?? (meta.get(uuid)?.duration ?? 2) / 2;
      const dest = join(stageDir, `${uuid}.jpg`);
      if (await extractFrame(video, t, dest)) {
        sources.set(uuid, dest);
      }
    }
    // Fallback: anything not fetched full-res → local ≤1024px preview.
    for (const uuid of winners) {
      if (!sources.has(uuid) && existsSync(cacheSrc(uuid))) {
        sources.set(uuid, cacheSrc(uuid));
        previewUuids.add(uuid);
      }
    }
  }

  const fullCount = [...sources.keys()].filter(
    (u) => !previewUuids.has(u)
  ).length;
  if (previewUuids.size > 0 && !fromCache) {
    log(
      `  ! ${fullCount} full-res, ${previewUuids.size} at preview quality (≤1024px — iCloud original unavailable).`
    );
    log(
      "    To upgrade the preview ones later: when iCloud downloads work, remove their NN.jpg + placed.json entries and re-run place --download."
    );
  }

  // Additive copy into public/photos/<slug>/ as next NN.jpg, in selection order.
  const publicDir = join(PUBLIC_PHOTOS, slug);
  await mkdir(publicDir, { recursive: true });
  let index = await nextIndex(publicDir);
  const newlyPlaced: string[] = [];
  for (const uuid of winners) {
    const src = sources.get(uuid);
    if (!src) {
      continue;
    }
    const dest = join(publicDir, `${pad2(index)}.jpg`);
    if (existsSync(dest)) {
      throw new Error(
        `Refusing to overwrite existing ${dest} (additive-only).`
      );
    }
    await copyFile(src, dest);
    const tag = previewUuids.has(uuid)
      ? " (preview ≤1024px)"
      : (isVideo(uuid)
        ? " (video frame)"
        : "");
    log(`  + ${slug}/${pad2(index)}.jpg${tag}`);
    newlyPlaced.push(uuid);
    index++;
  }

  await writeJson(paths.placedJson, [...placed, ...newlyPlaced]);
  await rm(stageDir, { force: true, recursive: true });

  // 3. Regenerate photos.generated.json via the existing build pipeline.
  log("  running build-photos…");
  const build = Bun.spawn(["bun", "run", "build-photos"], {
    stderr: "inherit",
    stdout: "inherit",
  });
  await build.exited;

  log(
    `  ✓ ${slug}: placed ${newlyPlaced.length} photos (now ${index - 1} total in gallery)`
  );
  log(
    `  reminder: update src/content/covers.generated.json if you want a new hero cover.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
