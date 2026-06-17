#!/usr/bin/env bun
import { existsSync } from "node:fs";
/**
 * Stage 1.5 — itinerary: reconstruct WHERE a trip went from photo GPS + time,
 * then split a mined pool into per-location legs.
 *
 *   bun run photos:itinerary <poolSlug> [--split-km N] [--min-photos N] [--partition]
 *
 * Reads .cache/photos/<poolSlug>/candidates.json (run `photos:mine <poolSlug>
 * --from .. --to ..` over the whole window first — no place filter), clusters
 * photos by reverse-geocoded city (GPS-gap sub-splits surface day-trips like the
 * Great Wall outside Beijing), and prints a human-readable itinerary table.
 *
 * Writes .cache/photos/<poolSlug>/_itinerary.json — the proposed legs. With
 * --partition it also materializes each leg as its own cache dir
 * (.cache/photos/<legSlug>/candidates.json + copied candidate jpgs) so
 * `photos:curate <legSlug>` / `photos:place <legSlug>` run unchanged.
 */
import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";

import {
  cachePaths,
  log,
  parseArgs,
  readJson,
  requireSlug,
  writeJson,
} from "./shared";

const DEFAULT_SPLIT_KM = 30; // sub-cluster >this from a city centroid = its own leg
const DEFAULT_MIN_PHOTOS = 4; // legs smaller than this are folded into nearest neighbor

interface Candidate {
  uuid: string;
  kind?: "photo" | "video";
  date: string | null;
  place: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

interface Leg {
  slug: string;
  location: string;
  city: string | null;
  country: string | null;
  from: string;
  to: string;
  year: string;
  count: number;
  centroid: { lat: number; lng: number } | null;
  uuids: string[];
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function centroidOf(pts: { lat: number; lng: number }[]): {
  lat: number;
  lng: number;
} | null {
  if (pts.length === 0) {
    return null;
  }
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return { lat, lng };
}

/** Fill missing city by the temporally-nearest candidate that has one. */
function fillCities(sorted: Candidate[]): void {
  const known = sorted.filter((c) => c.city && c.date);
  if (known.length === 0) {
    return;
  }
  for (const c of sorted) {
    if (c.city || !c.date) {
      continue;
    }
    const t = Date.parse(c.date);
    let best: Candidate | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const k of known) {
      const delta = Math.abs(Date.parse(k.date as string) - t);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = k;
      }
    }
    if (best) {
      c.city = best.city;
      c.country = c.country ?? best.country;
      if (c.lat == null && best.lat != null) {
        c.lat = best.lat;
        c.lng = best.lng;
      }
    }
  }
}

function gpsPts(items: Candidate[]): { lat: number; lng: number }[] {
  return items
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({ lat: c.lat as number, lng: c.lng as number }));
}

/** Within one city, peel off any GPS sub-cluster far from the centroid. */
function splitByDistance(
  items: Candidate[],
  splitKm: number
): { core: Candidate[]; far: Candidate[] } {
  const centroid = centroidOf(gpsPts(items));
  if (!centroid) {
    return { core: items, far: [] };
  }
  const core: Candidate[] = [];
  const far: Candidate[] = [];
  for (const c of items) {
    if (c.lat == null || c.lng == null) {
      core.push(c);
      continue;
    }
    const d = haversineKm(centroid, { lat: c.lat, lng: c.lng });
    (d > splitKm ? far : core).push(c);
  }
  return { core, far };
}

function dayRange(items: Candidate[]): { from: string; to: string } {
  const dates = items
    .map((c) => c.date)
    .filter((d): d is string => Boolean(d))
    .toSorted();
  const day = (d: string) => d.slice(0, 10);
  return {
    from: dates.length ? day(dates[0]) : "",
    to: dates.length ? day(dates.at(-1) as string) : "",
  };
}

function makeLeg(slugBase: string, location: string, items: Candidate[]): Leg {
  const { from, to } = dayRange(items);
  const year = (from || "").slice(0, 4) || "unknown";
  const country = items.find((c) => c.country)?.country ?? null;
  return {
    centroid: centroidOf(gpsPts(items)),
    city: items.find((c) => c.city)?.city ?? null,
    count: items.length,
    country,
    from,
    location,
    slug: `${slugBase}-${year}`,
    to,
    uuids: items.map((c) => c.uuid),
    year,
  };
}

async function main(): Promise<void> {
  const { slug: rawSlug, flags } = parseArgs();
  const pool = requireSlug(rawSlug, "photos:itinerary");
  const splitKm = flags["split-km"]
    ? Number(flags["split-km"])
    : DEFAULT_SPLIT_KM;
  const minPhotos = flags["min-photos"]
    ? Number(flags["min-photos"])
    : DEFAULT_MIN_PHOTOS;
  const doPartition = Boolean(flags.partition);

  const paths = cachePaths(pool);
  const candidates = await readJson<Candidate[]>(paths.candidatesJson, []);
  if (candidates.length === 0) {
    throw new Error(
      `No candidates for "${pool}" — run \`bun run photos:mine ${pool} --from .. --to ..\` first.`
    );
  }

  const sorted = [...candidates].toSorted((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "")
  );
  fillCities(sorted);

  // Group by city.
  const byCity = new Map<string, Candidate[]>();
  for (const c of sorted) {
    const key = c.city ?? "Unknown";
    (byCity.get(key) ?? byCity.set(key, []).get(key))?.push(c);
  }

  // Build legs, peeling off far GPS sub-clusters (e.g. Great Wall vs Beijing).
  let legs: Leg[] = [];
  for (const [city, items] of byCity) {
    const { core, far } = splitByDistance(items, splitKm);
    legs.push(makeLeg(kebab(city), city, core));
    if (far.length >= minPhotos) {
      legs.push(makeLeg(`${kebab(city)}-area`, `${city} (day trip)`, far));
    } else if (far.length > 0) {
      // too few to be its own leg — fold back into the core
      legs[legs.length - 1] = makeLeg(kebab(city), city, items);
    }
  }

  // Fold sub-min legs into the temporally-nearest larger leg's display only
  // (kept separate in JSON so you can still decide). Sort by first date.
  legs = legs
    .filter((l) => l.count > 0)
    .toSorted((a, b) => (a.from || "9999").localeCompare(b.from || "9999"));

  await writeJson(paths.root + "/_itinerary.json", legs);

  // Print table.
  log(`\nItinerary for "${pool}" — ${candidates.length} candidates\n`);
  log("  slug                         photos  dates                  centroid");
  log(
    "  ---------------------------  ------  ---------------------  ------------------"
  );
  for (const l of legs) {
    const slug = l.slug.padEnd(27);
    const n = String(l.count).padStart(5);
    const range = `${l.from}→${l.to}`.padEnd(21);
    const c = l.centroid
      ? `${l.centroid.lat.toFixed(3)},${l.centroid.lng.toFixed(3)}`
      : "(no gps)";
    const flag = l.count < minPhotos ? " ⚠ tiny" : "";
    log(`  ${slug}  ${n}  ${range}  ${c}${flag}`);
  }
  log(
    `\n  ${legs.length} legs. _itinerary.json written. Confirm/rename slugs, then:`
  );
  log(`    bun run photos:itinerary ${pool} --partition`);

  if (doPartition) {
    log("\n  partitioning into per-leg cache dirs…");
    for (const leg of legs) {
      const legPaths = cachePaths(leg.slug);
      await mkdir(legPaths.candidatesDir, { recursive: true });
      const legCands = candidates.filter((c) => leg.uuids.includes(c.uuid));
      for (const c of legCands) {
        const src = join(paths.candidatesDir, `${c.uuid}.jpg`);
        if (existsSync(src)) {
          await copyFile(src, join(legPaths.candidatesDir, `${c.uuid}.jpg`));
        }
      }
      await writeJson(legPaths.candidatesJson, legCands);
      log(`    ✓ ${leg.slug}: ${legCands.length} candidates`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
