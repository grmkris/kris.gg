#!/usr/bin/env bun
/**
 * Stage 1 — mine: gather candidates for a window WITHOUT touching iCloud.
 *
 *   bun run photos:mine <slug> [--from YYYY-MM-DD --to YYYY-MM-DD] [--force]
 *
 * <slug> may be a real trip (window derived from its date) OR any cache key when
 * --from/--to are given (e.g. a whole-trip pool like `china-2026` that itinerary
 * later splits into legs).
 *
 * Apple Photos is on "Optimise Mac Storage", so most originals are iCloud-only.
 * For PHOTOS we export the local preview (--preview-if-missing); for VIDEOS we
 * export the local poster frame (--preview). Both are fast and un-throttled, and
 * each is normalized to a ≤1024px JPEG for cheap AI inspection. Full-res photo
 * originals / the chosen video frame are only fetched later (place.ts).
 *
 * Outputs:
 *   .cache/photos/<slug>/candidates/<uuid>.jpg   normalized inspection images
 *   .cache/photos/<slug>/candidates.json         [{uuid, kind, date, place?, city?, country?, lat?, lng?, width, height, duration?}]
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

import {
  cachePaths,
  getTrip,
  log,
  osxphotos,
  parseArgs,
  readJson,
  requireSlug,
  tripWindow,
  writeJson,
} from "./shared";

const MAX_EDGE = 1024;
const JPEG_QUALITY = 82;

type Kind = "photo" | "video";

/** Where a candidate came from — drives source-aware curation. */
type Source = "iphone" | "glasses" | "whatsapp" | "wechat" | "other";

/** Classify provenance from the Photos album, UTI, and original filename. */
function classifySource(
  albums: string[],
  uti: string,
  filename: string
): Source {
  const set = new Set(albums);
  // Meta AI app media (Ray-Ban glasses POV clips land here).
  if (set.has("Meta AI")) {
    return "glasses";
  }
  if (set.has("WhatsApp") || /(?:-|_)WA\d{4}/.test(filename)) {
    return "whatsapp";
  }
  if (set.has("WeChat")) {
    return "wechat";
  }
  // Own device capture.
  if (
    /^IMG_\d+/.test(filename) ||
    uti === "public.heic" ||
    uti === "public.jpeg" ||
    uti === "com.apple.quicktime-movie"
  ) {
    return "iphone";
  }
  return "other";
}

interface Candidate {
  uuid: string;
  kind: Kind;
  source: Source;
  date: string | null;
  place: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  width: number;
  height: number;
  /** True original dimensions (the candidate jpg above is a ≤1024 preview). */
  assetWidth: number | null;
  assetHeight: number | null;
  /** Original is iCloud-only (not on this Mac) — full-res needs a download. */
  missing: boolean;
  duration?: number;
}

interface MediaMeta {
  uuid: string;
  source: Source;
  date: string | null;
  place: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  assetWidth: number | null;
  assetHeight: number | null;
  missing: boolean;
  duration?: number;
}

/** Strip osxphotos _edited/_preview suffix; UUIDs contain no underscores. */
function parseExportName(
  filename: string
): { uuid: string; priority: number } | null {
  const match = /^(.+?)(?:_(edited|preview))?\.jpe?g$/i.exec(filename);
  if (!match) {
    return null;
  }
  const kind = match[2]?.toLowerCase();
  // Prefer the edited render, then the original, then the low-res preview.
  const priority = kind === "edited" ? 3 : (kind === "preview" ? 1 : 2);
  return { priority, uuid: match[1] };
}

/** osxphotos query --json → uuid → {date, place, city, country, gps, duration}. */
async function queryMetadata(
  from: string,
  to: string,
  only: "--only-photos" | "--only-movies"
): Promise<Map<string, MediaMeta>> {
  const { stdout, exitCode, stderr } = await osxphotos([
    "query",
    "--from-date",
    from,
    "--to-date",
    to,
    only,
    "--not-hidden",
    "--json",
  ]);
  if (exitCode !== 0) {
    throw new Error(`osxphotos query failed:\n${stderr}`);
  }
  const map = new Map<string, MediaMeta>();
  // osxphotos embeds bare NaN / -Infinity (e.g. audio energyValues) — not valid
  // JSON. Coerce those tokens to null before parsing.
  const clean = stdout.replaceAll(/-?Infinity|NaN/g, "null");
  const records = JSON.parse(clean) as {
    uuid: string;
    date?: string;
    duration?: number;
    latitude?: number | null;
    longitude?: number | null;
    uti?: string | null;
    original_filename?: string | null;
    ismissing?: boolean | null;
    width?: number | null;
    height?: number | null;
    album_info?: { title?: string | null }[] | null;
    place?: {
      name?: string;
      address?: { city?: string; country?: string };
    } | null;
  }[];
  for (const rec of records) {
    const city = rec.place?.address?.city ?? null;
    const country = rec.place?.address?.country ?? null;
    const place = rec.place?.name ?? city ?? country ?? null;
    const albums = (rec.album_info ?? [])
      .map((a) => a.title ?? "")
      .filter(Boolean);
    map.set(rec.uuid, {
      assetHeight: rec.height ?? null,
      assetWidth: rec.width ?? null,
      city,
      country,
      date: rec.date ?? null,
      duration: rec.duration,
      lat: rec.latitude ?? null,
      lng: rec.longitude ?? null,
      missing: Boolean(rec.ismissing),
      place,
      source: classifySource(albums, rec.uti ?? "", rec.original_filename ?? ""),
      uuid: rec.uuid,
    });
  }
  return map;
}

interface PassStats {
  built: number;
  skipped: number;
  total: number;
  noPreview: number;
}

/** Export + normalize one media kind into the shared candidate map. */
async function minePass(
  kind: Kind,
  exportArgs: string[],
  only: "--only-photos" | "--only-movies",
  opts: {
    from: string;
    to: string;
    force: boolean;
    rawDir: string;
    candidatesDir: string;
    byUuid: Map<string, Candidate>;
  }
): Promise<PassStats> {
  const { from, to, force, rawDir, candidatesDir, byUuid } = opts;

  await rm(rawDir, { force: true, recursive: true });
  await mkdir(rawDir, { recursive: true });
  const exp = await osxphotos([
    "export",
    rawDir,
    "--from-date",
    from,
    "--to-date",
    to,
    ...exportArgs,
  ]);
  if (exp.exitCode !== 0) {
    throw new Error(`osxphotos export failed:\n${exp.stderr}`);
  }

  // Best file per uuid (edited > original > preview).
  const best = new Map<string, { file: string; priority: number }>();
  for (const file of await readdir(rawDir)) {
    const parsed = parseExportName(file);
    if (!parsed) {
      continue;
    }
    const current = best.get(parsed.uuid);
    if (!current || parsed.priority > current.priority) {
      best.set(parsed.uuid, { file, priority: parsed.priority });
    }
  }

  const meta = await queryMetadata(from, to, only);
  const noPreview = [...meta.keys()].filter((u) => !best.has(u)).length;

  let built = 0;
  let skipped = 0;
  for (const [uuid, { file }] of best) {
    const dest = join(candidatesDir, `${uuid}.jpg`);
    if (!force && existsSync(dest) && byUuid.has(uuid)) {
      skipped++;
      continue;
    }
    const input = await readFile(join(rawDir, file));
    const buffer = await sharp(input)
      .rotate()
      .resize({
        fit: "inside",
        height: MAX_EDGE,
        width: MAX_EDGE,
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    await Bun.write(dest, buffer);
    const dims = await sharp(buffer).metadata();
    const info = meta.get(uuid);
    byUuid.set(uuid, {
      assetHeight: info?.assetHeight ?? null,
      assetWidth: info?.assetWidth ?? null,
      city: info?.city ?? null,
      country: info?.country ?? null,
      date: info?.date ?? null,
      duration: info?.duration,
      height: dims.height ?? 0,
      kind,
      lat: info?.lat ?? null,
      lng: info?.lng ?? null,
      missing: info?.missing ?? false,
      place: info?.place ?? null,
      source: info?.source ?? "other",
      uuid,
      width: dims.width ?? 0,
    });
    built++;
  }

  await rm(rawDir, { force: true, recursive: true });
  return { built, noPreview, skipped, total: meta.size };
}

async function main(): Promise<void> {
  const { slug: rawSlug, flags } = parseArgs();
  const slug = requireSlug(rawSlug, "photos:mine");
  const fromArg = flags.from as string | undefined;
  const toArg = flags.to as string | undefined;
  // Only require a real trip when the window isn't given explicitly.
  if (!(fromArg && toArg)) {
    getTrip(slug);
  }
  const force = Boolean(flags.force);
  const { from, to } = tripWindow(slug, fromArg, toArg);
  const paths = cachePaths(slug);

  log(`mining ${slug} (${from} → ${to})`);
  await mkdir(paths.candidatesDir, { recursive: true });
  // Read loosely: older manifests may lack newer fields — backfill defaults.
  type StoredCandidate = Partial<Candidate> & { uuid: string };
  const existing = await readJson<StoredCandidate[]>(paths.candidatesJson, []);
  const byUuid = new Map<string, Candidate>(
    existing.map((c) => [
      c.uuid,
      {
        assetHeight: c.assetHeight ?? null,
        assetWidth: c.assetWidth ?? null,
        city: c.city ?? null,
        country: c.country ?? null,
        date: c.date ?? null,
        duration: c.duration,
        height: c.height ?? 0,
        kind: c.kind ?? "photo",
        lat: c.lat ?? null,
        lng: c.lng ?? null,
        missing: c.missing ?? false,
        place: c.place ?? null,
        source: c.source ?? "other",
        uuid: c.uuid,
        width: c.width ?? 0,
      },
    ])
  );
  const shared = {
    byUuid,
    candidatesDir: paths.candidatesDir,
    force,
    from,
    rawDir: join(paths.root, "_raw"),
    to,
  };

  // Photos: local preview, prefer edited render.
  const photos = await minePass(
    "photo",
    [
      "--only-photos",
      "--not-hidden",
      "--skip-bursts",
      "--skip-live",
      "--preview-if-missing",
      "--convert-to-jpeg",
      "--jpeg-quality",
      "0.9",
      "--filename",
      "{uuid}",
    ],
    "--only-photos",
    shared
  );
  log(
    `  ✓ photos: ${photos.built} new, ${photos.skipped} cached${photos.noPreview ? `, ${photos.noPreview} without local preview` : ""}`
  );

  // Videos: local poster frame only (full clip fetched later for chosen frame).
  const videos = await minePass(
    "video",
    ["--only-movies", "--not-hidden", "--preview", "--filename", "{uuid}"],
    "--only-movies",
    shared
  );
  log(
    `  ✓ videos: ${videos.built} new, ${videos.skipped} cached${videos.noPreview ? `, ${videos.noPreview} without local poster` : ""}`
  );

  const candidates = [...byUuid.values()].toSorted((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "")
  );
  await writeJson(paths.candidatesJson, candidates);

  const nVideo = candidates.filter((c) => c.kind === "video").length;
  log(
    `  ✓ ${slug}: ${candidates.length} candidates (${candidates.length - nVideo} photos, ${nVideo} videos)`
  );
  const bySource = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.source] = (acc[c.source] ?? 0) + 1;
    return acc;
  }, {});
  const nMissing = candidates.filter((c) => c.missing).length;
  log(
    `    sources: ${Object.entries(bySource)
      .map(([s, n]) => `${s} ${n}`)
      .join(", ")}${nMissing ? ` · ${nMissing} iCloud-only` : ""}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
