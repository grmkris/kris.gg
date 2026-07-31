/**
 * OpenRouteService request construction and response decoding — the pure half.
 *
 * Split from `ors.ts` (which is `server-only` because it holds the API key and
 * does the fetching) for the same reason `src/stash/middleware.ts` is split from
 * `middleware-live.ts`: `server-only` throws the moment it is imported outside a
 * server context, which would make every one of these rules untestable.
 *
 * The rules encoded here are ORS hard errors, not preferences:
 * - `round_trip` accepts **exactly one** coordinate; two or more is a 400.
 * - `green`/`quiet` are `foot-*` only.
 * - `steepness_difficulty` is `cycling-*` only.
 */

import { bboxOf, loopGapM, pathLengthM } from "@/lib/route/geo";
import type { Coord } from "@/lib/route/geo";

import { RouteCandidate, RouteStats, RoutingFailed } from "./schema";
import type {
  AvoidFeature,
  Position,
  RouteProfile,
  StartPoint,
} from "./schema";

/** ORS rejects round trips longer than this outright. */
export const MAX_ROUND_TRIP_M = 100_000;

const EARTH_RADIUS_M = 6_371_008.8;

export type LoopStrategy = "round-trip" | "synthetic";

export interface OrsRouteRequest {
  readonly avoidFeatures: readonly AvoidFeature[];
  readonly green: number | null;
  readonly lengthM: number;
  readonly points: number;
  readonly profile: RouteProfile;
  readonly quiet: number | null;
  readonly seed: number;
  readonly start: StartPoint;
  readonly steepnessDifficulty: number | null;
}

export const isFootProfile = (profile: RouteProfile): boolean =>
  profile.startsWith("foot-");

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/**
 * Sending a foot-only weighting to a cycling profile (or vice versa) is a hard
 * 400 from ORS, not a silently ignored field. This is the one place that rule
 * lives.
 */
const weightingsFor = (
  request: OrsRouteRequest
): Record<string, number> | undefined => {
  const weightings: Record<string, number> = {};

  if (isFootProfile(request.profile)) {
    if (request.green !== null) {
      weightings.green = clamp(request.green, 0, 1);
    }
    if (request.quiet !== null) {
      weightings.quiet = clamp(request.quiet, 0, 1);
    }
  } else if (request.steepnessDifficulty !== null) {
    weightings.steepness_difficulty = Math.round(
      clamp(request.steepnessDifficulty, 0, 3)
    );
  }

  return Object.keys(weightings).length === 0 ? undefined : weightings;
};

const commonOptions = (request: OrsRouteRequest): Record<string, unknown> => {
  const options: Record<string, unknown> = {};

  if (request.avoidFeatures.length > 0) {
    options.avoid_features = [...request.avoidFeatures];
  }
  const weightings = weightingsFor(request);
  if (weightings !== undefined) {
    options.profile_params = { weightings };
  }

  return options;
};

/** Native round-trip body. Exactly one coordinate — see the note above. */
export const buildRoundTripBody = (
  request: OrsRouteRequest
): Record<string, unknown> => ({
  coordinates: [[request.start.lon, request.start.lat]],
  elevation: true,
  instructions: false,
  options: {
    ...commonOptions(request),
    round_trip: {
      length: clamp(request.lengthM, 100, MAX_ROUND_TRIP_M),
      points: Math.round(clamp(request.points, 2, 8)),
      seed: request.seed,
    },
  },
});

/**
 * Fallback loop, used if `round_trip` turns out to be disabled for a profile on
 * the public instance: place waypoints on a circle around the start and route
 * through them back to the start.
 *
 * The radius is deliberately smaller than `length / 2π` — roads never take the
 * geometric path, so a circle sized for the target circumference reliably
 * overshoots. The 0.8 factor is a heuristic; ranking against the requested
 * distance is what actually keeps the output honest.
 */
export const buildSyntheticLoopBody = (
  request: OrsRouteRequest
): Record<string, unknown> => {
  const count = Math.round(clamp(request.points, 3, 8));
  const radiusM = (request.lengthM / (2 * Math.PI)) * 0.8;

  const latDegPerM = 180 / (Math.PI * EARTH_RADIUS_M);
  const cosLat = Math.cos((request.start.lat * Math.PI) / 180);
  const lonDegPerM = latDegPerM / (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat);

  // The seed only rotates the ring: same shape, different streets — which is
  // what makes a re-roll feel like a genuinely different route.
  const rotation = ((request.seed % 360) * Math.PI) / 180;

  const ring = Array.from({ length: count }, (_, index) => {
    const angle = rotation + (index * 2 * Math.PI) / count;
    return [
      request.start.lon + radiusM * Math.sin(angle) * lonDegPerM,
      request.start.lat + radiusM * Math.cos(angle) * latDegPerM,
    ];
  });

  return {
    coordinates: [
      [request.start.lon, request.start.lat],
      ...ring,
      [request.start.lon, request.start.lat],
    ],
    elevation: true,
    instructions: false,
    options: commonOptions(request),
  };
};

export const buildBody = (
  request: OrsRouteRequest,
  strategy: LoopStrategy
): Record<string, unknown> =>
  strategy === "round-trip"
    ? buildRoundTripBody(request)
    : buildSyntheticLoopBody(request);

export interface OrsGeoJson {
  readonly features?: readonly {
    readonly geometry?: {
      readonly coordinates?: readonly (readonly number[])[];
    };
    readonly properties?: {
      readonly summary?: {
        readonly ascent?: number;
        readonly descent?: number;
        readonly distance?: number;
        readonly duration?: number;
      };
    };
  }[];
}

/** Force every position to `[lon, lat, ele]`; ORS omits Z if elevation is off. */
const toPositions = (raw: readonly (readonly number[])[]): Position[] =>
  raw.map((point) => [point[0] ?? 0, point[1] ?? 0, point[2] ?? 0]);

export const decodeCandidate = (
  body: OrsGeoJson,
  seed: number
): RouteCandidate => {
  const feature = body.features?.[0];
  const raw = feature?.geometry?.coordinates;

  if (raw === undefined || raw.length < 2) {
    throw new RoutingFailed({
      message: "OpenRouteService returned no usable geometry.",
    });
  }

  const coords = toPositions(raw);
  const asCoords: Coord[] = coords;
  const summary = feature?.properties?.summary;

  return new RouteCandidate({
    bbox: bboxOf(asCoords) as RouteCandidate["bbox"],
    coords,
    seed,
    stats: new RouteStats({
      // `ascent`/`descent` are omitted entirely when elevation was not
      // requested, so never assume they are present.
      ascentM: summary?.ascent ?? 0,
      descentM: summary?.descent ?? 0,
      distanceM: summary?.distance ?? pathLengthM(asCoords),
      durationS: summary?.duration ?? 0,
      loopGapM: loopGapM(asCoords),
    }),
  });
};

/**
 * Deterministic seed set — derived from a base rather than random, so a generate
 * call is reproducible and 🎲 can ask for "the next N" explicitly. The stride is
 * a prime so nearby bases don't collide.
 */
export const seedsFrom = (base: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) => base + index * 7919);
