/**
 * Deterministic inputs → constraints mapping. Pure, no AI.
 *
 * This is the floor the planner stands on: the whole pipeline produces a valid
 * route with this alone. The model in `ai.ts` refines these constraints using
 * the free-text note, but a missing API key, a quota error or a malformed
 * generation must degrade to *this*, never to a failure.
 *
 * The profile-specific `null`s are not cosmetic — `green`/`quiet` are `foot-*`
 * only and `steepness_difficulty` is `cycling-*` only, and sending either to the
 * wrong profile is a hard 400 from ORS.
 */

import type {
  Activity,
  AvoidFeature,
  Mood,
  PoiCategory,
  RankBy,
  RouteConstraints,
  RouteInputs,
  RouteProfile,
} from "./schema";

const PROFILE_FOR: Record<Activity, RouteProfile> = {
  bike: "cycling-regular",
  hike: "foot-hiking",
  run: "foot-walking",
  walk: "foot-walking",
};

type MoodProfile = {
  readonly green: number;
  readonly poiCategories: readonly PoiCategory[];
  readonly quiet: number;
  readonly rankBy: RankBy;
  /** 0-3 climb tolerance, used only when the profile is a cycling one. */
  readonly steepness: number;
};

const MOOD: Record<Mood, MoodProfile> = {
  fast: {
    green: 0,
    poiCategories: ["drinking_water"],
    quiet: 0.3,
    rankBy: "closest-distance",
    steepness: 3,
  },
  nature: {
    green: 1,
    poiCategories: ["park", "viewpoint", "drinking_water"],
    quiet: 0.7,
    rankBy: "balanced",
    steepness: 2,
  },
  quiet: {
    green: 0.5,
    poiCategories: ["park", "viewpoint"],
    quiet: 0.9,
    rankBy: "balanced",
    steepness: 1,
  },
  scenic: {
    green: 0.8,
    poiCategories: ["viewpoint", "park", "artwork"],
    quiet: 0.4,
    rankBy: "balanced",
    steepness: 2,
  },
  tourist: {
    green: 0.3,
    poiCategories: ["viewpoint", "artwork", "cafe", "bakery"],
    quiet: 0.2,
    rankBy: "most-pois",
    steepness: 1,
  },
};

/**
 * Ferries are avoided everywhere — one would silently break a loop. Steps are
 * avoided for runs and rides but kept for walks and hikes, where a staircase is
 * often the point.
 */
const AVOID_FOR: Record<Activity, readonly AvoidFeature[]> = {
  bike: ["ferries", "steps"],
  hike: ["ferries"],
  run: ["ferries", "steps"],
  walk: ["ferries"],
};

/**
 * More waypoints make a rounder loop; too many on a short route ties it in
 * knots. Roughly one extra point per 2km, bounded to the range ORS accepts.
 */
export const pointsForDistance = (distanceKm: number): number =>
  Math.min(8, Math.max(3, Math.round(distanceKm / 2) + 2));

export const fallbackConstraints = (inputs: RouteInputs): RouteConstraints => {
  const profile = PROFILE_FOR[inputs.activity];
  const mood = MOOD[inputs.mood];
  const isFoot = profile.startsWith("foot-");

  return {
    avoidFeatures: AVOID_FOR[inputs.activity],
    green: isFoot ? mood.green : null,
    lengthM: Math.round(Math.max(0.5, inputs.distanceKm) * 1000),
    points: pointsForDistance(inputs.distanceKm),
    poiCategories: mood.poiCategories,
    profile,
    quiet: isFoot ? mood.quiet : null,
    rankBy: mood.rankBy,
    steepnessDifficulty: isFoot ? null : mood.steepness,
  };
};

/**
 * Force a model-produced constraint set back into legality.
 *
 * The model is instructed about the foot/cycling split but cannot be trusted to
 * honour it, and one wrong field is a 400 rather than a degraded route. Distance
 * is also pinned to what the user actually asked for — that is a slider, not
 * something open to interpretation.
 */
export const sanitizeConstraints = (
  candidate: RouteConstraints,
  inputs: RouteInputs
): RouteConstraints => {
  const isFoot = candidate.profile.startsWith("foot-");
  const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

  return {
    avoidFeatures: candidate.avoidFeatures,
    green:
      isFoot && candidate.green !== null ? clamp01(candidate.green) : null,
    lengthM: Math.round(Math.max(0.5, inputs.distanceKm) * 1000),
    points: Math.min(8, Math.max(2, Math.round(candidate.points))),
    poiCategories: candidate.poiCategories,
    profile: candidate.profile,
    quiet:
      isFoot && candidate.quiet !== null ? clamp01(candidate.quiet) : null,
    rankBy: candidate.rankBy,
    steepnessDifficulty:
      isFoot || candidate.steepnessDifficulty === null
        ? null
        : Math.min(3, Math.max(0, Math.round(candidate.steepnessDifficulty))),
  };
};
