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
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

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
  keep?: boolean;
  score?: number;
}

// Placed gallery images: bake EXIF orientation + cap the long edge (build-photos
// downscales anyway and does NOT auto-rotate, so portraits must be baked here).
const PLACE_MAX_EDGE = 2400;
const PLACE_QUALITY = 88;

// A real iPhone original is ~3-4k on the long edge; osxphotos/PhotoKit silently
// return small cached DERIVATIVES (256/360/768/1024/1280px) for iCloud originals
// that aren't fully synced. Anything below this is not a usable full-res source.
const MIN_FULLRES_EDGE = 1600;

/** Long edge of an image in px (0 if unreadable). */
async function edgeOf(path: string): Promise<number> {
  try {
    const m = await sharp(path).metadata();
    return Math.max(m.width ?? 0, m.height ?? 0);
  } catch {
    return 0;
  }
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
 * Bulk-download iCloud originals at full-res via PhotoKit (Apple's native
 * framework — reliable + fast here, unlike the default AppleScript path which
 * stalls on this Mac). One export for the whole missing set; timeout scales
 * with count. Returns uuid→file for everything that landed.
 */
async function downloadBulk(
  stageDir: string,
  uuidFile: string,
  uuids: string[]
): Promise<Map<string, string>> {
  await writeFile(uuidFile, `${uuids.join("\n")}\n`);
  await osxphotos(
    [
      "export",
      stageDir,
      "--uuid-from-file",
      uuidFile,
      "--download-missing",
      "--use-photokit",
      ...PHOTO_JPEG,
    ],
    { timeoutMs: Math.min(1_800_000, 120_000 + uuids.length * 15_000) }
  );
  return pickByUuid(await readdir(stageDir));
}

/**
 * Per-item fallback for stragglers the bulk pass missed — its own dir + process
 * (fresh osxphotos db, isolated timeout) so one stalled item can't block the
 * rest. Tries PhotoKit, then the default Photos.app export.
 */
async function downloadOne(
  baseDir: string,
  uuid: string
): Promise<string | null> {
  const dir = join(baseDir, uuid);
  await mkdir(dir, { recursive: true });
  for (const extra of [["--use-photokit"], [] as string[]]) {
    await osxphotos(
      [
        "export",
        dir,
        "--uuid",
        uuid,
        "--download-missing",
        ...extra,
        ...PHOTO_JPEG,
      ],
      { timeoutMs: 240_000 }
    );
    const file = pickByUuid(await readdir(dir)).get(uuid);
    if (file) {
      return join(dir, file);
    }
  }
  return null;
}

async function main(): Promise<void> {
  const { slug: rawSlug, flags } = parseArgs();
  const slug = requireSlug(rawSlug, "photos:place");
  getTrip(slug); // validate
  const fromCache = Boolean(flags["from-cache"]);
  const download = Boolean(flags.download);
  const auto = Boolean(flags.auto);
  const paths = cachePaths(slug);

  let selection = await readJson<Selection | null>(paths.selectionJson, null);
  if ((!selection || selection.uuids.length === 0) && auto) {
    // --auto: skip the review app and take curate's keep flags directly,
    // best score first (the "Gemini + light agent pass" path).
    const scoredAll = await readJson<ScoredLite[]>(paths.scoredJson, []);
    const uuids = scoredAll
      .filter((s) => s.keep)
      .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((s) => s.uuid);
    selection = { savedAt: new Date().toISOString(), slug, uuids };
    log(`  --auto: ${uuids.length} winners from curate keep flags`);
  }
  if (!selection || selection.uuids.length === 0) {
    throw new Error(
      `No selection — run \`bun run photos:review ${slug}\` and save first, or pass --auto to use curate's keep flags.`
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
    // Track the best (largest-edge) source per uuid. osxphotos/PhotoKit can
    // return a small derivative for an un-synced original, so first-found isn't
    // enough — keep the largest and only treat >= MIN_FULLRES_EDGE as full-res.
    const best = new Map<string, { path: string; edge: number }>();
    const consider = async (uuid: string, path: string) => {
      const edge = await edgeOf(path);
      const cur = best.get(uuid);
      if (!cur || edge > cur.edge) {
        best.set(uuid, { edge, path });
      }
    };
    const stillSmall = (u: string) =>
      (best.get(u)?.edge ?? 0) < MIN_FULLRES_EDGE;

    // Photos. Pass 1: LOCAL export — instant for already-synced originals.
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
        await consider(uuid, join(localDir, file));
      }
      // Pass 2 (--download): bulk PhotoKit for anything missing OR only a small
      // local derivative (the silent-thumbnail case).
      const needDownload = photoWinners.filter(stillSmall);
      if (download && needDownload.length > 0) {
        const dlDir = join(stageDir, "dl");
        await mkdir(dlDir, { recursive: true });
        log(`  downloading ${needDownload.length} originals (bulk, PhotoKit)…`);
        const bulk = await downloadBulk(
          dlDir,
          join(paths.root, "missing.txt"),
          needDownload
        );
        for (const [uuid, file] of bulk) {
          await consider(uuid, join(dlDir, file));
        }
        // Per-item retry for those still below full-res.
        const leftover = needDownload.filter(stillSmall);
        for (let i = 0; i < leftover.length; i++) {
          log(
            `  retry ${i + 1}/${leftover.length} ${leftover[i].slice(0, 8)}…`
          );
          const file = await downloadOne(join(stageDir, "retry"), leftover[i]);
          if (file) {
            await consider(leftover[i], file);
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
        await consider(uuid, dest);
      }
    }
    // Last resort: the ≤1024 mine preview, but only if it beats what we have
    // (a 1024 preview tops a 256px thumbnail; it won't override a 1280 derivative).
    for (const uuid of winners) {
      if (stillSmall(uuid) && existsSync(cacheSrc(uuid))) {
        await consider(uuid, cacheSrc(uuid));
      }
    }
    // Commit the best source per uuid; flag any that never reached full-res.
    for (const [uuid, b] of best) {
      sources.set(uuid, b.path);
      if (b.edge < MIN_FULLRES_EDGE) {
        previewUuids.add(uuid);
      }
    }
  }

  const fullCount = [...sources.keys()].filter(
    (u) => !previewUuids.has(u)
  ).length;
  if (previewUuids.size > 0 && !fromCache) {
    log(
      `  ! ${fullCount} full-res, ${previewUuids.size} LOW-RES (<${MIN_FULLRES_EDGE}px — iCloud original not synced): ${[...previewUuids].map((u) => u.slice(0, 8)).join(", ")}`
    );
    log(
      "    Let Photos finish downloading originals (Settings → iCloud, or right-click → Download Original), then `rm` their NN.jpg + placed.json entries and re-run place --download."
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
    await sharp(src)
      .rotate()
      .resize({
        fit: "inside",
        height: PLACE_MAX_EDGE,
        width: PLACE_MAX_EDGE,
        withoutEnlargement: true,
      })
      .jpeg({ mozjpeg: true, quality: PLACE_QUALITY })
      .toFile(dest);
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
