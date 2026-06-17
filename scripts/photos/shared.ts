#!/usr/bin/env bun
/**
 * Shared helpers for the photo pipeline (mine → curate → review → place).
 *
 * Conventions match scripts/build-photos.ts: relative paths from repo root,
 * promise-based I/O, "  ✓ slug: …" logging.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { TRIPS, type Trip } from "../../src/content/trips";

/** osxphotos is Python-only; ~/.local/bin/osxphotos is the shim on PATH. */
export const OSXPHOTOS = join(homedir(), ".local/bin/osxphotos");
export const PUBLIC_PHOTOS = "public/photos";
export const CACHE_ROOT = ".cache/photos";

const NN_JPG = /^(\d{2})\.jpe?g$/i;

export function log(msg: string): void {
  console.log(msg);
}

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function getTrip(slug: string): Trip {
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) {
    throw new Error(
      `No trip with slug "${slug}" in src/content/trips.ts. Known slugs: ${TRIPS.map((t) => t.slug).join(", ")}`
    );
  }
  return trip;
}

/**
 * Resolve the Apple Photos date window for a trip. Trip dates are month
 * granularity ("YYYY-MM"); the window covers the whole month. --from / --to
 * (YYYY-MM-DD) override. `to` is exclusive (osxphotos --to-date is "before").
 */
export function tripWindow(
  slug: string,
  fromArg?: string,
  toArg?: string
): { from: string; to: string } {
  if (fromArg && toArg) {
    return { from: fromArg, to: toArg };
  }
  const { date } = getTrip(slug);
  const [yearStr, monthStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!(year && month)) {
    throw new Error(
      `Trip "${slug}" has date "${date}" — not "YYYY-MM". Pass --from/--to explicitly.`
    );
  }
  const from = fromArg ?? `${yearStr}-${pad2(month)}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = toArg ?? `${nextYear}-${pad2(nextMonth)}-01`;
  return { from, to };
}

export interface CachePaths {
  root: string;
  candidatesDir: string;
  candidatesJson: string;
  scoredJson: string;
  selectionJson: string;
  placedJson: string;
  videosDir: string;
  framesDir: string;
}

export function cachePaths(slug: string): CachePaths {
  const root = join(CACHE_ROOT, slug);
  return {
    candidatesDir: join(root, "candidates"),
    candidatesJson: join(root, "candidates.json"),
    framesDir: join(root, "frames"),
    placedJson: join(root, "placed.json"),
    root,
    scoredJson: join(root, "scored.json"),
    selectionJson: join(root, "selection.json"),
    videosDir: join(root, "videos"),
  };
}

/** Run osxphotos. Returns captured stdout/stderr and exit code. `timeoutMs`
 * kills the process if it hangs (iCloud downloads can stall indefinitely). */
export async function osxphotos(
  args: string[],
  opts: { timeoutMs?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn([OSXPHOTOS, ...args], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const timer = opts.timeoutMs
    ? setTimeout(() => proc.kill(9), opts.timeoutMs)
    : null;
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (timer) {
    clearTimeout(timer);
  }
  return { exitCode, stderr, stdout };
}

/**
 * Get one video's full-res original — LOCAL-ONLY by default (no iCloud fetch).
 * Bulk video downloads hammer iCloud and trigger an originals-download throttle
 * that then blocks photos too, so videos are local-first: the clip must already
 * be on disk (via Photos.app "Download Original" or "Download Originals to this
 * Mac"). Pass `download:true` to opt into the (throttled) on-demand fetch.
 *
 * Cached in a per-uuid subdir so each export starts with a fresh osxphotos db —
 * a shared dir's leftover .osxphotos_export.db triggers an interactive [y/N]
 * prompt that hangs a non-TTY spawn.
 */
export async function ensureVideo(
  slug: string,
  uuid: string,
  opts: { download?: boolean } = {}
): Promise<string | null> {
  const dir = join(cachePaths(slug).videosDir, uuid);
  await mkdir(dir, { recursive: true });
  const find = async () =>
    (await readdir(dir)).find((f) => /\.(mov|mp4|m4v|avi)$/i.test(f));
  const cached = await find();
  if (cached) {
    return join(dir, cached);
  }
  const args = ["export", dir, "--uuid", uuid, "--filename", "{uuid}"];
  if (opts.download) {
    args.push("--download-missing", "--use-photokit");
  }
  await osxphotos(args);
  const file = await find();
  return file ? join(dir, file) : null;
}

/** Seconds of a video via ffprobe (0 if unknown). */
export async function ffprobeDuration(videoPath: string): Promise<number> {
  const proc = Bun.spawn(
    [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nk=1:nw=1",
      videoPath,
    ],
    { stderr: "ignore", stdout: "pipe" }
  );
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const d = Number.parseFloat(out.trim());
  return Number.isFinite(d) ? d : 0;
}

/** Extract a single JPEG frame at time `t`. `width` downscales (omit for full-res). */
export async function extractFrame(
  videoPath: string,
  t: number,
  destPath: string,
  width?: number
): Promise<boolean> {
  const vf = width ? ["-vf", `scale=${width}:-2`] : [];
  const proc = Bun.spawn(
    [
      "ffmpeg",
      "-y",
      "-ss",
      String(t),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      ...vf,
      "-q:v",
      "3",
      destPath,
    ],
    { stderr: "ignore", stdout: "ignore" }
  );
  await proc.exited;
  return existsSync(destPath);
}

/**
 * Next additive index for a gallery folder: max existing NN + 1 (respects
 * gaps, never reuses a number). Returns 1 for a missing/empty folder.
 * Throws past 99 — 3-digit names would break build-photos' /^\d{2}\.jpe?g$/.
 */
export async function nextIndex(dir: string): Promise<number> {
  if (!existsSync(dir)) {
    return 1;
  }
  const indices = (await readdir(dir))
    .map((f) => NN_JPG.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  const max = indices.length > 0 ? Math.max(...indices) : 0;
  if (max >= 99) {
    throw new Error(
      `${dir} already has 99 photos — 2-digit naming is exhausted.`
    );
  }
  return max + 1;
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** Minimal CLI parser: first bare token = slug, --key value | --flag. */
export function parseArgs(argv: string[] = Bun.argv.slice(2)): {
  slug: string;
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  let slug = "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!slug) {
      slug = arg;
    }
  }
  return { flags, slug };
}

export function requireSlug(slug: string, script: string): string {
  if (!slug) {
    throw new Error(`Usage: bun run ${script} <slug> [options]`);
  }
  return slug;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Split into fixed-size chunks (last chunk may be smaller). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Trip slugs that have a cache dir under .cache/photos (sorted). */
export async function listCachedSlugs(): Promise<string[]> {
  if (!existsSync(CACHE_ROOT)) {
    return [];
  }
  const entries = await readdir(CACHE_ROOT, { withFileTypes: true });
  return entries
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .toSorted();
}
