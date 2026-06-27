#!/usr/bin/env bun
/**
 * Stage 5 — meta: materialize a COMMITTED per-photo metadata file from the
 * pipeline's AI output, so captions/tags/scores ship with the repo (durable
 * followup search, alt text, on-site filtering) instead of living only in the
 * gitignored .cache.
 *
 *   bun run photos:meta
 *
 * Joins, for every placed slug, .cache/photos/<slug>/placed.json (NN → uuid, by
 * placement order) with scored.json (uuid → caption/tags/score/scene from
 * curate's Gemini pass) → src/content/photos.meta.json:
 *
 *   { "<slug>": { "01": { caption, tags, score, scene }, "02": {…}, … } }
 *
 * Keyed by NN (matching the placed NN.jpg / the site's positional manifest), not
 * uuid, since build-photos and the site have no uuid on Vercel. Idempotent —
 * re-run after any photos:place.
 */
import {
  cachePaths,
  listCachedSlugs,
  log,
  pad2,
  readJson,
  writeJson,
} from "./shared";

const OUTPUT = "src/content/photos.meta.json";

interface ScoredLite {
  uuid: string;
  caption?: string;
  tags?: string[];
  score?: number;
  scene?: string;
}

interface MetaEntry {
  caption: string;
  tags: string[];
  score: number;
  scene: string;
}

async function main(): Promise<void> {
  const slugs = await listCachedSlugs();
  const out: Record<string, Record<string, MetaEntry>> = {};

  for (const slug of slugs) {
    const paths = cachePaths(slug);
    const placed = await readJson<string[]>(paths.placedJson, []);
    if (placed.length === 0) {
      continue;
    }
    const scored = await readJson<ScoredLite[]>(paths.scoredJson, []);
    const byUuid = new Map(scored.map((s) => [s.uuid, s]));

    const entries: Record<string, MetaEntry> = {};
    placed.forEach((uuid, i) => {
      const s = byUuid.get(uuid);
      if (!s) {
        return;
      }
      entries[pad2(i + 1)] = {
        caption: s.caption ?? "",
        scene: s.scene ?? "",
        score: s.score ?? 0,
        tags: s.tags ?? [],
      };
    });

    if (Object.keys(entries).length > 0) {
      out[slug] = entries;
      log(`  ✓ ${slug}: ${Object.keys(entries).length} photos`);
    }
  }

  await writeJson(OUTPUT, out);
  const total = Object.values(out).reduce(
    (acc, e) => acc + Object.keys(e).length,
    0
  );
  log(
    `\nWrote ${OUTPUT} (${total} photos across ${Object.keys(out).length} trips)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
