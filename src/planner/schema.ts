/**
 * The planner domain schema — one definition decoded at every boundary: the
 * HTTP payload, the D1 row, the typed browser client, and the AI structured
 * output.
 *
 * **Never use bare `Schema.Number` here.** Effect encodes it as
 * `anyOf: [number, "NaN", "Infinity", "-Infinity"]` so that non-finite values
 * survive a round-trip, which is correct for JSON but poison in a JSON Schema
 * handed to a model. `Schema.Finite` → `{"type":"number"}` and `Schema.Int` →
 * `{"type":"integer"}` both stay clean.
 */

import { Schema } from "effect";

export const Activity = Schema.Literals(["run", "walk", "hike", "bike"]);
export type Activity = typeof Activity.Type;

export const Mood = Schema.Literals([
  "scenic",
  "quiet",
  "tourist",
  "fast",
  "nature",
]);
export type Mood = typeof Mood.Type;

/** OpenRouteService profile ids. */
export const RouteProfile = Schema.Literals([
  "foot-walking",
  "foot-hiking",
  "cycling-regular",
  "cycling-mountain",
]);
export type RouteProfile = typeof RouteProfile.Type;

/**
 * ORS `avoid_features`. The enum is global but validity is per-profile — these
 * three are the ones valid for both `foot-*` and `cycling-*`. Sending
 * `highways`/`tollways` on a foot profile is a hard 400.
 */
export const AvoidFeature = Schema.Literals(["steps", "ferries", "fords"]);
export type AvoidFeature = typeof AvoidFeature.Type;

export const PoiCategory = Schema.Literals([
  "cafe",
  "bakery",
  "viewpoint",
  "drinking_water",
  "toilets",
  "park",
  "artwork",
]);
export type PoiCategory = typeof PoiCategory.Type;

/** How to pick a winner from the candidate set. See `rank.ts`. */
export const RankBy = Schema.Literals([
  "balanced",
  "flattest",
  "hilliest",
  "closest-distance",
  "most-pois",
]);
export type RankBy = typeof RankBy.Type;

/** `[lon, lat, ele]` — GeoJSON order, elevation always present (we always ask). */
export const Position = Schema.Tuple([
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
]);
export type Position = typeof Position.Type;

/** `[west, south, east, north]`. */
export const Bbox = Schema.Tuple([
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
]);
export type Bbox = typeof Bbox.Type;

export const StartPoint = Schema.Struct({
  lat: Schema.Finite,
  lon: Schema.Finite,
});
export type StartPoint = typeof StartPoint.Type;

// ─────────────────────────────────────────────────────────────────────────────
// Request
// ─────────────────────────────────────────────────────────────────────────────

/** What the single-screen form submits. */
export const RouteInputs = Schema.Struct({
  activity: Activity,
  distanceKm: Schema.Finite,
  mood: Mood,
  notes: Schema.optional(Schema.String),
  start: StartPoint,
});
export type RouteInputs = typeof RouteInputs.Type;

/**
 * The routing constraints — the *only* thing the model produces. Geometry comes
 * from ORS; the model never draws anything. Descriptions are load-bearing: they
 * become the JSON Schema `description` the model actually reads.
 */
export const RouteConstraints = Schema.Struct({
  avoidFeatures: Schema.Array(AvoidFeature).annotate({
    description:
      "Route features to avoid. Use 'steps' for stroller/wheelchair/running comfort.",
  }),
  green: Schema.NullOr(Schema.Finite).annotate({
    description:
      "0-1 preference for green/park routing. Foot profiles ONLY — must be null for cycling. Note 0 is not 'off', it is already the green base factor; use null for neutral routing.",
  }),
  lengthM: Schema.Int.annotate({
    description: "Target round-trip length in metres.",
  }),
  points: Schema.Int.annotate({
    description:
      "How many waypoints ORS should use to shape the loop, 2-8. Larger values give rounder, less out-and-back routes.",
  }),
  poiCategories: Schema.Array(PoiCategory).annotate({
    description: "Points of interest worth finding along this route.",
  }),
  profile: RouteProfile.annotate({
    description:
      "ORS routing profile. run/walk -> foot-walking, hike -> foot-hiking, bike -> cycling-regular.",
  }),
  quiet: Schema.NullOr(Schema.Finite).annotate({
    description:
      "0-1 preference for quiet, low-traffic ways. Foot profiles ONLY — must be null for cycling.",
  }),
  rankBy: RankBy.annotate({
    description: "Which criterion decides the winner among the candidates.",
  }),
  steepnessDifficulty: Schema.NullOr(Schema.Int).annotate({
    description:
      "0-3 climb tolerance, cycling profiles ONLY — must be null for foot. 0 novice, 3 pro.",
  }),
});
export type RouteConstraints = typeof RouteConstraints.Type;

// ─────────────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────────────

export class Poi extends Schema.Class<Poi>("Poi")({
  atMeters: Schema.Finite,
  category: PoiCategory,
  id: Schema.String,
  lat: Schema.Finite,
  lon: Schema.Finite,
  name: Schema.NullOr(Schema.String),
}) {}

export class RouteStats extends Schema.Class<RouteStats>("RouteStats")({
  ascentM: Schema.Finite,
  descentM: Schema.Finite,
  distanceM: Schema.Finite,
  durationS: Schema.Finite,
  /** Distance between first and last point. A "loop" with a big gap is a bug. */
  loopGapM: Schema.Finite,
}) {}

export class RouteCandidate extends Schema.Class<RouteCandidate>(
  "RouteCandidate"
)({
  bbox: Bbox,
  coords: Schema.Array(Position),
  /** The ORS `round_trip.seed` that produced this one — re-rolling it is 🎲. */
  seed: Schema.Int,
  stats: RouteStats,
}) {}

/** A generated route, before it is saved. */
export class GeneratedRoute extends Schema.Class<GeneratedRoute>(
  "GeneratedRoute"
)({
  alternates: Schema.Array(RouteCandidate),
  chosen: RouteCandidate,
  constraints: RouteConstraints,
  inputs: RouteInputs,
  pois: Schema.Array(Poi),
  title: Schema.String,
  /** Grounded bullets explaining the choice. Empty if the model was unavailable. */
  why: Schema.Array(Schema.String),
}) {}

export const PlannedRouteId = Schema.String.pipe(
  Schema.brand("PlannedRouteId")
);
export type PlannedRouteId = typeof PlannedRouteId.Type;

/** A saved route. `shareId` is null until sharing is explicitly turned on. */
export class PlannedRoute extends Schema.Class<PlannedRoute>("PlannedRoute")({
  activity: Activity,
  bbox: Bbox,
  constraints: RouteConstraints,
  coords: Schema.Array(Position),
  createdAt: Schema.Finite,
  id: PlannedRouteId,
  inputs: RouteInputs,
  pois: Schema.Array(Poi),
  shareId: Schema.NullOr(Schema.String),
  stats: RouteStats,
  title: Schema.String,
  why: Schema.Array(Schema.String),
}) {}

// ─────────────────────────────────────────────────────────────────────────────
// Errors. Passed to endpoints as an ARRAY so each class's `httpApiStatus`
// annotation is honoured — a Schema.Union loses the per-class status and
// everything degrades to 500. Same rule as src/stash/schema.ts.
// ─────────────────────────────────────────────────────────────────────────────

export class RouteNotFound extends Schema.TaggedErrorClass<RouteNotFound>()(
  "RouteNotFound",
  { id: Schema.String },
  { httpApiStatus: 404 }
) {}

/** An upstream failure — ORS unreachable, over quota, or returned nothing usable. */
export class RoutingFailed extends Schema.TaggedErrorClass<RoutingFailed>()(
  "RoutingFailed",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

export class PlannerStoreError extends Schema.TaggedErrorClass<PlannerStoreError>()(
  "PlannerStoreError",
  { message: Schema.String },
  { httpApiStatus: 500 }
) {}
