#!/usr/bin/env bun
import { google } from "@ai-sdk/google";
import { generateObject, generateText, NoObjectGeneratedError } from "ai";
/**
 * Stage 2 — curate: classify candidates, then rank them comparatively.
 *
 *   bun run photos:curate <slug> [--keep N] [--reclassify] [--rerank] [--force] [--limit N]
 *
 * Phase A (classify): per-image call tags each candidate {offTrip, exclude,
 *   caption, tags}. Cheap, reliable, cached (skip already-classified unless
 *   --reclassify/--force). Usable = !offTrip && !exclude.
 * Phase B (rank): a comparative tournament — batches of ~12 images are ranked
 *   AGAINST EACH OTHER (which spreads judgement, unlike isolated 0-100 scoring),
 *   assigning a tier (S–D) + scene label. The top tiers are re-ranked across
 *   batches until a small finalist set remains, then ordered. A diversity cap
 *   (≤2 per scene) picks the top N keepers from the result.
 *
 *   --rerank redoes only Phase B, reusing existing classifications (cheap).
 *
 * Env: GOOGLE_GENERATIVE_AI_API_KEY (required), GEMINI_MODEL,
 *      GEMINI_RANK_MODEL (optional — sharper model for the ranking phase).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import {
  cachePaths,
  chunk,
  getTrip,
  log,
  parseArgs,
  readJson,
  requireSlug,
  shuffle,
  writeJson,
} from "./shared";

const CONCURRENCY = 6;
const MAX_ATTEMPTS = 5;
const BATCH = 12; // images per comparative ranking call
const MAX_PER_SCENE = 3; // diversity cap: near-duplicates of one scene
const MIN_KEEP_SCORE = 55; // tier-B floor; keep everything at/above this by default
const MAX_ROUNDS = 5;

const TAGS = [
  "document",
  "screenshot",
  "blurry",
  "duplicate",
  "people",
  "portrait",
  "landscape",
  "cityscape",
  "architecture",
  "food",
  "night",
  "other",
] as const;

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];
const TIER_ORDER: Record<Tier, number> = { A: 1, B: 2, C: 3, D: 4, S: 0 };

const ClassifySchema = z.object({
  caption: z.string().describe("One short factual caption (<=12 words)"),
  exclude: z
    .boolean()
    .describe("True for documents, screenshots, receipts, memes, blurry, junk"),
  offTrip: z
    .boolean()
    .describe("True if clearly NOT from this trip (home, work, everyday life)"),
  tags: z.array(z.enum(TAGS)),
});
type Classification = z.infer<typeof ClassifySchema>;

const RankSchema = z.object({
  ranking: z.array(
    z.object({
      index: z.number().int().describe("1-based photo number from the prompt"),
      note: z.string().describe("brief reason"),
      rankInBatch: z.number().int().describe("1 = best of this set"),
      scene: z
        .string()
        .describe("short subject/location label for grouping near-duplicates"),
      tier: z.enum(TIERS),
    })
  ),
});

interface Candidate {
  uuid: string;
  kind?: "photo" | "video";
  date: string | null;
  place: string | null;
  width: number;
  height: number;
  duration?: number;
}

type Scored = Candidate &
  Classification & {
    tier?: Tier;
    scene?: string;
    rank?: number;
    note?: string;
    score: number;
    keep: boolean;
  };

interface RankInfo {
  tier: Tier;
  rankInBatch: number;
  scene: string;
  note: string;
}

function imagePart(buffer: Buffer) {
  return { image: buffer, mediaType: "image/jpeg", type: "image" as const };
}

/** Retry on 429/5xx/empty-object with exponential backoff + jitter. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status =
        (error as { statusCode?: number; status?: number })?.statusCode ??
        (error as { status?: number })?.status;
      const retryable =
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        NoObjectGeneratedError.isInstance(error);
      if (attempt >= MAX_ATTEMPTS || !retryable) {
        throw error;
      }
      await Bun.sleep(2 ** attempt * 500 + Math.random() * 400);
    }
  }
}

/** Run `fn` over items with a bounded worker pool (passes item + index). */
async function pool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await fn(items[index], index);
      }
    })
  );
}

/** First usable Gemini model id: env → known-good fallbacks. */
async function resolveModel(envVar: string): Promise<string> {
  const wanted = [
    process.env[envVar],
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ].filter((m): m is string => Boolean(m));
  const seen = new Set<string>();
  for (const id of wanted) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    try {
      await generateText({
        maxOutputTokens: 1,
        maxRetries: 0,
        model: google(id),
        prompt: "ping",
      });
      return id;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `Could not bind a Gemini model (tried ${[...seen].join(", ")}). Check GOOGLE_GENERATIVE_AI_API_KEY.`
  );
}

// ---------- Phase A: classify ----------

function classifyPrompt(
  trip: { title: string; location: string; date: string },
  candidate: Candidate
): string {
  const where = candidate.place ? `Metadata place: ${candidate.place}. ` : "";
  return [
    `This photo may belong to a travel gallery for "${trip.title}" — ${trip.location}, ${trip.date}.`,
    `${where}Capture date: ${candidate.date ?? "unknown"}.`,
    "Write a short factual caption and tag it.",
    "offTrip=true if it is clearly from somewhere else (home town, office, unrelated everyday life).",
    "exclude=true for documents, screenshots, receipts, memes, or heavily blurred/unusable shots.",
  ].join(" ");
}

async function classifyOne(
  modelId: string,
  prompt: string,
  imagePath: string
): Promise<Classification> {
  const image = await readFile(imagePath);
  const { object } = await withRetry(() =>
    generateObject({
      maxRetries: 0,
      messages: [
        {
          content: [{ text: prompt, type: "text" }, imagePart(image)],
          role: "user",
        },
      ],
      model: google(modelId),
      schema: ClassifySchema,
    })
  );
  return object;
}

// ---------- Phase B: comparative rank tournament ----------

function rankPrompt(
  trip: { title: string; location: string; date: string },
  count: number
): string {
  return [
    `You are curating a travel photo gallery for "${trip.title}" — ${trip.location}, ${trip.date}.`,
    `Below are ${count} photos, each labelled "Photo K". Rank them RELATIVE TO EACH OTHER for the gallery.`,
    "Assign each a tier: S = cover-quality (striking composition + light + iconic subject), A = strong keeper, B = solid, C = mediocre snapshot, D = skip.",
    "SPREAD your judgement across tiers — do not put everything in one tier.",
    "rankInBatch: 1 = best of this set, increasing for worse.",
    'scene: a short subject/location label (e.g. "Seokchon Lake cherry blossoms", "Myeongdong street night", "Korean BBQ") so near-duplicates can be grouped.',
    "Penalise near-duplicates; reward variety and iconic moments.",
    "Return exactly one entry per photo, keyed by its index (1..N).",
  ].join(" ");
}

async function rankBatch(
  modelId: string,
  trip: { title: string; location: string; date: string },
  paths: { candidatesDir: string },
  batch: Scored[]
): Promise<Map<string, RankInfo>> {
  const content: (
    | { text: string; type: "text" }
    | ReturnType<typeof imagePart>
  )[] = [{ text: rankPrompt(trip, batch.length), type: "text" }];
  for (let i = 0; i < batch.length; i++) {
    const buffer = await readFile(
      join(paths.candidatesDir, `${batch[i].uuid}.jpg`)
    );
    content.push({
      text: `Photo ${i + 1} — "${batch[i].caption}"`,
      type: "text",
    });
    content.push(imagePart(buffer));
  }

  const { object } = await withRetry(() =>
    generateObject({
      maxRetries: 0,
      messages: [{ content, role: "user" }],
      model: google(modelId),
      schema: RankSchema,
    })
  );

  const out = new Map<string, RankInfo>();
  for (const r of object.ranking) {
    const idx = r.index - 1;
    if (idx >= 0 && idx < batch.length) {
      out.set(batch[idx].uuid, {
        note: r.note,
        rankInBatch: r.rankInBatch,
        scene: r.scene,
        tier: r.tier,
      });
    }
  }
  // Any photo the model dropped → default to tier C, worst rank.
  for (const item of batch) {
    if (!out.has(item.uuid)) {
      out.set(item.uuid, {
        note: "(missing from model output)",
        rankInBatch: batch.length,
        scene: "",
        tier: "C",
      });
    }
  }
  return out;
}

async function runBatches(
  batches: Scored[][],
  fn: (batch: Scored[]) => Promise<Map<string, RankInfo>>
): Promise<Map<string, RankInfo>> {
  const results = new Array<Map<string, RankInfo>>(batches.length);
  await pool(batches, CONCURRENCY, async (batch, i) => {
    results[i] = await fn(batch);
  });
  const merged = new Map<string, RankInfo>();
  for (const r of results) {
    for (const [uuid, info] of r) {
      merged.set(uuid, info);
    }
  }
  return merged;
}

type Ranked = RankInfo & { depth: number };

function isTop(tier: Tier | undefined): boolean {
  return tier === "S" || tier === "A";
}

async function tournament(
  modelId: string,
  trip: { title: string; location: string; date: string },
  paths: { candidatesDir: string },
  usable: Scored[]
): Promise<Map<string, Ranked>> {
  const info = new Map<string, Ranked>();
  const rank = (batch: Scored[]) => rankBatch(modelId, trip, paths, batch);
  // Each evaluation deepens a photo's `depth`; surviving more rounds = better,
  // which is the only globally-comparable signal (a single round's tier is only
  // relative to that batch).
  const apply = (res: Map<string, RankInfo>) => {
    for (const [uuid, v] of res) {
      info.set(uuid, { ...v, depth: (info.get(uuid)?.depth ?? 0) + 1 });
    }
  };

  // Round 1: tier everyone.
  apply(await runBatches(chunk(shuffle(usable), BATCH), rank));
  log(
    `    round 1: tiered ${usable.length} photos in ${chunk(usable, BATCH).length} batches`
  );

  // Rounds 2+: re-rank the S/A contenders across batches until they fit one batch.
  let contenders = usable.filter((s) => isTop(info.get(s.uuid)?.tier));
  let round = 2;
  while (contenders.length > BATCH && round <= MAX_ROUNDS) {
    apply(await runBatches(chunk(shuffle(contenders), BATCH), rank));
    const next = contenders.filter((s) => isTop(info.get(s.uuid)?.tier));
    log(`    round ${round}: ${contenders.length} → ${next.length} contenders`);
    if (next.length === 0 || next.length === contenders.length) {
      break; // no further separation
    }
    contenders = next;
    round++;
  }

  // Final round: rank the finalists together for a clean global order.
  if (contenders.length > 1) {
    apply(await rank(contenders));
    log(`    final: ranked ${contenders.length} finalists`);
  }
  return info;
}

/**
 * Order usable photos best→worst by tournament advancement (depth), then assign
 * a linear spread score and a display tier derived from position (the model's
 * per-batch tier is not globally comparable, so we don't use it for ordering).
 */
function orderAndScore(usable: Scored[], info: Map<string, Ranked>): Scored[] {
  const get = (s: Scored) => info.get(s.uuid) as Ranked;
  const ordered = [...usable].toSorted((a, b) => {
    const da = get(a);
    const db = get(b);
    if (da.depth !== db.depth) {
      return db.depth - da.depth; // deeper (survived more rounds) first
    }
    if (da.rankInBatch !== db.rankInBatch) {
      return da.rankInBatch - db.rankInBatch;
    }
    if (TIER_ORDER[da.tier] !== TIER_ORDER[db.tier]) {
      return TIER_ORDER[da.tier] - TIER_ORDER[db.tier];
    }
    return (a.date ?? "").localeCompare(b.date ?? "");
  });

  const n = ordered.length;
  ordered.forEach((s, i) => {
    s.rank = i + 1;
    s.scene = get(s).scene;
    s.note = get(s).note;
    s.score = n <= 1 ? 100 : Math.round(100 - (90 * i) / (n - 1));
    s.tier =
      s.score >= 90
        ? "S"
        : s.score >= 75
          ? "A"
          : s.score >= 55
            ? "B"
            : s.score >= 35
              ? "C"
              : "D";
  });
  return ordered;
}

/**
 * Best-first pick, keeping everything scoring >= `minScore` (default: no cap),
 * capping near-duplicate scenes. Pass a finite `n` to hard-cap the count.
 */
function selectDiverse(
  ordered: Scored[],
  n: number,
  minScore: number
): Set<string> {
  const keep = new Set<string>();
  const sceneCount = new Map<string, number>();
  for (const s of ordered) {
    if (keep.size >= n) {
      break;
    }
    if (s.score < minScore) {
      continue;
    }
    const scene = (s.scene ?? "").toLowerCase().trim();
    const count = sceneCount.get(scene) ?? 0;
    if (scene === "" || count < MAX_PER_SCENE) {
      keep.add(s.uuid);
      sceneCount.set(scene, count + 1);
    }
  }
  // With an explicit finite cap, fill remaining slots (above threshold) even if
  // it means exceeding the per-scene cap.
  if (Number.isFinite(n) && keep.size < n) {
    for (const s of ordered) {
      if (keep.size >= n) {
        break;
      }
      if (s.score >= minScore) {
        keep.add(s.uuid);
      }
    }
  }
  return keep;
}

async function main(): Promise<void> {
  const { slug: rawSlug, flags } = parseArgs();
  const slug = requireSlug(rawSlug, "photos:curate");
  const trip = getTrip(slug);
  const paths = cachePaths(slug);
  const force = Boolean(flags.force);
  const reclassify = Boolean(flags.reclassify) || force;
  const rerank = Boolean(flags.rerank);
  // No cap by default — keep every photo scoring >= minScore. `--keep N` caps.
  const keepCount =
    flags.keep && flags.keep !== "all"
      ? Number(flags.keep)
      : Number.POSITIVE_INFINITY;
  const minScore = flags["min-score"]
    ? Number(flags["min-score"])
    : MIN_KEEP_SCORE;
  const limit = flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env (see .env.example)."
    );
  }

  const candidates = await readJson<Candidate[]>(paths.candidatesJson, []);
  if (candidates.length === 0) {
    throw new Error(
      `No candidates — run \`bun run photos:mine ${slug}\` first.`
    );
  }

  const prior = await readJson<Scored[]>(paths.scoredJson, []);
  const byUuid = new Map<string, Scored>(prior.map((s) => [s.uuid, s]));

  // ---- Phase A: classify ----
  if (rerank) {
    if (byUuid.size === 0) {
      throw new Error(
        `--rerank needs prior classifications — run \`bun run photos:curate ${slug}\` first.`
      );
    }
  } else {
    const todo = (
      reclassify ? candidates : candidates.filter((c) => !byUuid.has(c.uuid))
    ).slice(0, limit);
    log(
      `classify ${slug}: ${todo.length} to classify, ${candidates.length - todo.length} cached`
    );
    if (todo.length > 0) {
      const modelId = await resolveModel("GEMINI_MODEL");
      log(`  ✓ model: ${modelId}`);
      let done = 0;
      let failed = 0;
      const flush = () => writeJson(paths.scoredJson, [...byUuid.values()]);
      await pool(todo, CONCURRENCY, async (candidate) => {
        try {
          const cls = await classifyOne(
            modelId,
            classifyPrompt(trip, candidate),
            join(paths.candidatesDir, `${candidate.uuid}.jpg`)
          );
          byUuid.set(candidate.uuid, {
            ...candidate,
            ...cls,
            keep: false,
            score: 0,
          });
        } catch (error) {
          failed++;
          console.error(`  ! ${candidate.uuid}: ${(error as Error).message}`);
          return;
        }
        done++;
        if (done % 25 === 0) {
          log(`    classified ${done}/${todo.length}`);
          await flush();
        }
      });
      await flush();
      log(`  classified ${done}, failed ${failed}`);
    }
  }

  // ---- Phase B: comparative rank tournament ----
  const all = [...byUuid.values()];
  const usable = all.filter((s) => !(s.offTrip || s.exclude));
  if (usable.length === 0) {
    throw new Error(`No usable photos for ${slug} (all off-trip/excluded).`);
  }
  log(`rank ${slug}: ${usable.length} usable photos`);

  const rankModel = await resolveModel("GEMINI_RANK_MODEL");
  log(`  ✓ rank model: ${rankModel}`);
  const info = await tournament(rankModel, trip, paths, usable);
  const ordered = orderAndScore(usable, info);

  // Reset non-usable, then flag the diverse top N.
  for (const s of all) {
    if (s.offTrip || s.exclude) {
      s.score = 0;
      s.keep = false;
      s.tier = undefined;
    }
  }
  const keepUuids = selectDiverse(ordered, keepCount, minScore);
  for (const s of all) {
    s.keep = keepUuids.has(s.uuid);
  }

  const output = [...all].toSorted((a, b) => b.score - a.score);
  await writeJson(paths.scoredJson, output);

  const tierCounts = TIERS.map(
    (t) => `${t}:${ordered.filter((s) => s.tier === t).length}`
  ).join(" ");
  log(
    `  ✓ ${slug}: ${usable.length} usable [${tierCounts}], ${keepUuids.size} flagged keep`
  );
  log(`  next: bun run photos:review ${slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
