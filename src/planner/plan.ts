import "server-only";

/**
 * The generate pipeline: inputs → constraints → K candidates → rank → POIs →
 * explanation.
 *
 * Ordering is deliberate. Geometry is produced before the model is consulted a
 * second time, so the expensive, failable parts (ORS) happen while the optional
 * parts (Gemini, Overpass) can still be skipped without losing the result.
 */

import { type Coord, downsampleTo } from "@/lib/route/geo";
import { estimateDurationS } from "@/lib/route/pace";
import { explainRoute, refineConstraints } from "./ai";
import { fallbackConstraints } from "./constraints-fallback";
import { fetchCandidates, orsApiKey } from "./ors";
import type { LoopStrategy } from "./ors-request";
import { fetchPois } from "./overpass";
import { rankCandidates, withinDistanceTolerance } from "./rank";
import {
  GeneratedRoute,
  type Poi,
  RouteCandidate,
  type RouteInputs,
  RouteStats,
} from "./schema";

/** How many seeds to try per generate. Four sits well inside ORS's 40/min. */
export const CANDIDATE_COUNT = 4;

/**
 * Cap on the geometry sent to the browser and stored in D1. Well above what is
 * visually distinguishable at city zoom, well below D1's 1 MB row limit.
 */
export const MAX_STORED_POINTS = 1000;

export type PlanOptions = {
  readonly count?: number;
  readonly seedBase?: number;
  readonly strategy?: LoopStrategy;
};

/**
 * `Coord` leaves elevation optional; `Position` requires it. Simplification
 * preserves whatever was there, so this fills the gap rather than casting.
 */
const toPositions = (coords: readonly Coord[]): RouteCandidate["coords"] =>
  coords.map((coord) => [coord[0], coord[1], coord[2] ?? 0] as const);

/**
 * Trim geometry for transport/storage and replace ORS's duration with a
 * pace-based estimate.
 *
 * ORS reports the duration for the *profile*, and runs, walks and hikes all
 * route on `foot-*` — so its figure would tell someone their 5 km run takes an
 * hour. Correcting it here means every consumer reads one honest number from
 * `stats.durationS` rather than each having to remember the caveat.
 */
const finalize = (
  candidate: RouteCandidate,
  activity: RouteInputs["activity"]
): RouteCandidate =>
  new RouteCandidate({
    bbox: candidate.bbox,
    coords:
      candidate.coords.length <= MAX_STORED_POINTS
        ? candidate.coords
        : toPositions(downsampleTo(candidate.coords, MAX_STORED_POINTS)),
    seed: candidate.seed,
    stats: new RouteStats({
      ascentM: candidate.stats.ascentM,
      descentM: candidate.stats.descentM,
      distanceM: candidate.stats.distanceM,
      durationS: estimateDurationS(
        activity,
        candidate.stats.distanceM,
        candidate.stats.ascentM
      ),
      loopGapM: candidate.stats.loopGapM,
    }),
  });

export const planRoute = async (
  inputs: RouteInputs,
  options: PlanOptions = {}
): Promise<GeneratedRoute> => {
  const apiKey = orsApiKey();

  // 1. Constraints. The deterministic table is the floor; the model only refines.
  const constraints = await refineConstraints(
    inputs,
    fallbackConstraints(inputs)
  );

  // 2. Geometry — the only step that may not fail.
  const candidates = await fetchCandidates(
    {
      avoidFeatures: constraints.avoidFeatures,
      green: constraints.green,
      lengthM: constraints.lengthM,
      points: constraints.points,
      profile: constraints.profile,
      quiet: constraints.quiet,
      start: inputs.start,
      steepnessDifficulty: constraints.steepnessDifficulty,
    },
    {
      apiKey,
      count: options.count ?? CANDIDATE_COUNT,
      seedBase: options.seedBase,
      strategy: options.strategy,
    }
  );

  const viable = withinDistanceTolerance(candidates, constraints.lengthM);

  // 3. Rank. Ranking by POI density needs POIs for *every* candidate, which
  //    costs an Overpass call each — so only pay that when it actually decides
  //    the winner.
  const poiCounts =
    constraints.rankBy === "most-pois"
      ? await Promise.all(
          viable.map(async (candidate) =>
            (
              await fetchPois({
                categories: constraints.poiCategories,
                coords: candidate.coords,
              })
            ).length
          )
        )
      : undefined;

  const ranked = rankCandidates(viable, {
    poiCounts,
    rankBy: constraints.rankBy,
    targetM: constraints.lengthM,
  });

  const winner = ranked[0]?.candidate;
  if (winner === undefined) {
    // fetchCandidates already raises when everything failed, so this is
    // unreachable in practice — but the type says it is possible.
    throw new Error("No route candidates survived ranking.");
  }

  const chosen = finalize(winner, inputs.activity);

  // 4. POIs for the winner, and 5. the explanation. Both degrade to empty.
  const pois: readonly Poi[] = await fetchPois({
    categories: constraints.poiCategories,
    coords: chosen.coords,
  });

  const explanation = await explainRoute({
    candidate: chosen,
    durationS: chosen.stats.durationS,
    inputs,
    pois,
  });

  return new GeneratedRoute({
    alternates: ranked
      .slice(1)
      .map((scored) => finalize(scored.candidate, inputs.activity)),
    chosen,
    constraints,
    inputs,
    pois,
    title: explanation.title,
    why: explanation.why,
  });
};
