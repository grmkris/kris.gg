/**
 * Candidate scoring. Pure — no network, no Effect.
 *
 * This is the mechanism the whole product leans on. ORS exposes a routing knob
 * for some preferences (`green`, `quiet`) but not others: there is no "flatter"
 * weighting for foot profiles at all. Rather than pretend, the planner always
 * generates K candidates on different seeds and *picks*. The same function then
 * powers 🎲 Generate Again (serve the next-best) and every refine chip (re-rank
 * with a different criterion).
 *
 * Scores are "lower is better". Metrics are min-max normalised across the
 * candidate set before weighting, so the weights below are comparable to each
 * other regardless of the units involved.
 */

import type { RankBy, RouteCandidate } from "./schema";

export interface ScoredCandidate {
  readonly candidate: RouteCandidate;
  readonly poiCount: number;
  readonly score: number;
}

export interface RankOptions {
  readonly rankBy: RankBy;
  /** The requested distance in metres — every criterion cares about this. */
  readonly targetM: number;
  /** POIs found near each candidate, index-aligned. Omit if unknown. */
  readonly poiCounts?: readonly number[];
}

interface Weights {
  readonly ascent: number;
  readonly distance: number;
  readonly gap: number;
  readonly pois: number;
}

/** Negative weight = a bonus rather than a penalty. */
const WEIGHTS: Record<RankBy, Weights> = {
  balanced: { ascent: 0.25, distance: 1, gap: 0.5, pois: -0.25 },
  "closest-distance": { ascent: 0, distance: 1, gap: 0.5, pois: 0 },
  flattest: { ascent: 1, distance: 0.6, gap: 0.5, pois: 0 },
  hilliest: { ascent: -1, distance: 0.6, gap: 0.5, pois: 0 },
  "most-pois": { ascent: 0, distance: 0.6, gap: 0.5, pois: -1 },
};

/** How far off the requested distance a candidate is, as a ratio of target. */
export const distanceErrorRatio = (
  candidate: RouteCandidate,
  targetM: number
): number =>
  targetM <= 0 ? 0 : Math.abs(candidate.stats.distanceM - targetM) / targetM;

/**
 * Min-max to 0..1. A flat set (every value identical) normalises to all-zero
 * rather than all-one, so a metric nobody differs on contributes nothing instead
 * of penalising everyone equally.
 */
const normalize = (values: readonly number[]): number[] => {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values.map((value) => (span === 0 ? 0 : (value - min) / span));
};

/** Score every candidate and return them sorted best-first. */
export const rankCandidates = (
  candidates: readonly RouteCandidate[],
  { rankBy, targetM, poiCounts }: RankOptions
): ScoredCandidate[] => {
  if (candidates.length === 0) {
    return [];
  }

  const weights = WEIGHTS[rankBy];

  const distances = normalize(
    candidates.map((candidate) => distanceErrorRatio(candidate, targetM))
  );
  const ascents = normalize(
    candidates.map((candidate) => candidate.stats.ascentM)
  );
  const gaps = normalize(
    candidates.map((candidate) => candidate.stats.loopGapM)
  );
  const counts = candidates.map((_, index) => poiCounts?.[index] ?? 0);
  const pois = normalize(counts);

  return candidates
    .map((candidate, index) => ({
      candidate,
      poiCount: counts[index],
      score:
        distances[index] * weights.distance +
        ascents[index] * weights.ascent +
        gaps[index] * weights.gap +
        pois[index] * weights.pois,
    }))
    .toSorted((a, b) => a.score - b.score);
};

/**
 * Reject candidates that missed the requested distance badly enough that no
 * amount of scenery makes up for it. Applied before ranking; if it would empty
 * the set, the set is returned untouched so the user still gets *something*
 * rather than an error.
 */
export const withinDistanceTolerance = (
  candidates: readonly RouteCandidate[],
  targetM: number,
  tolerance = 0.25
): readonly RouteCandidate[] => {
  const kept = candidates.filter(
    (candidate) => distanceErrorRatio(candidate, targetM) <= tolerance
  );
  return kept.length === 0 ? candidates : kept;
};
