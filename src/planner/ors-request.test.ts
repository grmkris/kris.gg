import { describe, expect, it } from "bun:test";

import {
  buildBody,
  buildRoundTripBody,
  buildSyntheticLoopBody,
  decodeCandidate,
  isFootProfile,
  MAX_ROUND_TRIP_M,
  seedsFrom,
} from "./ors-request";
import type { OrsRouteRequest } from "./ors-request";
import { RoutingFailed } from "./schema";

const base: OrsRouteRequest = {
  avoidFeatures: [],
  green: null,
  lengthM: 5000,
  points: 4,
  profile: "foot-walking",
  quiet: null,
  seed: 1,
  start: { lat: 46.05, lon: 14.5 },
  steepnessDifficulty: null,
};

/** Narrow the loosely-typed body for assertions. */
const options = (body: Record<string, unknown>): Record<string, unknown> =>
  body.options as Record<string, unknown>;

const weightings = (body: Record<string, unknown>): Record<string, number> =>
  (options(body).profile_params as { weightings: Record<string, number> })
    ?.weightings;

describe("buildRoundTripBody", () => {
  it("sends exactly one coordinate — ORS 400s on two or more", () => {
    const body = buildRoundTripBody(base);
    expect(body.coordinates).toEqual([[14.5, 46.05]]);
  });

  it("uses lon,lat order", () => {
    const [pair] = buildRoundTripBody(base).coordinates as number[][];
    expect(pair[0]).toBe(14.5);
    expect(pair[1]).toBe(46.05);
  });

  it("always requests elevation", () => {
    expect(buildRoundTripBody(base).elevation).toBe(true);
  });

  it("carries length, points and seed", () => {
    const trip = options(buildRoundTripBody({ ...base, seed: 42 })).round_trip;
    expect(trip).toEqual({ length: 5000, points: 4, seed: 42 });
  });

  it("clamps length to the ORS maximum and points to 2-8", () => {
    const tooLong = options(
      buildRoundTripBody({ ...base, lengthM: 500_000, points: 99 })
    ).round_trip as { length: number; points: number };
    expect(tooLong.length).toBe(MAX_ROUND_TRIP_M);
    expect(tooLong.points).toBe(8);

    const tooSmall = options(buildRoundTripBody({ ...base, points: 0 }))
      .round_trip as { points: number };
    expect(tooSmall.points).toBe(2);
  });
});

describe("profile-specific weightings", () => {
  it("sends green/quiet for foot profiles", () => {
    const body = buildRoundTripBody({
      ...base,
      green: 0.8,
      profile: "foot-walking",
      quiet: 0.6,
    });
    expect(weightings(body)).toEqual({ green: 0.8, quiet: 0.6 });
  });

  it("NEVER sends green/quiet for cycling — ORS rejects it outright", () => {
    const body = buildRoundTripBody({
      ...base,
      green: 0.8,
      profile: "cycling-regular",
      quiet: 0.6,
    });
    expect(options(body).profile_params).toBeUndefined();
  });

  it("sends steepness_difficulty for cycling only", () => {
    const cycling = buildRoundTripBody({
      ...base,
      profile: "cycling-regular",
      steepnessDifficulty: 2,
    });
    expect(weightings(cycling)).toEqual({ steepness_difficulty: 2 });

    const foot = buildRoundTripBody({
      ...base,
      profile: "foot-hiking",
      steepnessDifficulty: 2,
    });
    expect(options(foot).profile_params).toBeUndefined();
  });

  it("clamps weightings into their documented ranges", () => {
    expect(
      weightings(buildRoundTripBody({ ...base, green: 5, quiet: -3 }))
    ).toEqual({ green: 1, quiet: 0 });

    expect(
      weightings(
        buildRoundTripBody({
          ...base,
          profile: "cycling-regular",
          steepnessDifficulty: 9,
        })
      )
    ).toEqual({ steepness_difficulty: 3 });
  });

  it("omits profile_params entirely when nothing is set", () => {
    expect(options(buildRoundTripBody(base)).profile_params).toBeUndefined();
  });
});

describe("avoid_features", () => {
  it("passes them through when present and omits the key when empty", () => {
    expect(
      options(buildRoundTripBody({ ...base, avoidFeatures: ["steps"] }))
        .avoid_features
    ).toEqual(["steps"]);
    expect(options(buildRoundTripBody(base)).avoid_features).toBeUndefined();
  });
});

describe("buildSyntheticLoopBody", () => {
  it("returns to the start and has no round_trip option", () => {
    const body = buildSyntheticLoopBody(base);
    const coords = body.coordinates as number[][];
    expect(coords[0]).toEqual(coords[coords.length - 1]);
    expect(options(body).round_trip).toBeUndefined();
  });

  it("emits start + ring + start", () => {
    const coords = buildSyntheticLoopBody({ ...base, points: 5 })
      .coordinates as number[][];
    expect(coords).toHaveLength(7);
  });

  it("rotates the ring with the seed, so a re-roll differs", () => {
    const a = buildSyntheticLoopBody({ ...base, seed: 0 })
      .coordinates as number[][];
    const b = buildSyntheticLoopBody({ ...base, seed: 90 })
      .coordinates as number[][];
    expect(a[1]).not.toEqual(b[1]);
  });

  it("keeps the ring near the start", () => {
    const coords = buildSyntheticLoopBody(base).coordinates as number[][];
    for (const [lon, lat] of coords) {
      expect(Math.abs(lat - 46.05)).toBeLessThan(0.2);
      expect(Math.abs(lon - 14.5)).toBeLessThan(0.2);
    }
  });
});

describe("buildBody", () => {
  it("dispatches on strategy", () => {
    expect(options(buildBody(base, "round-trip")).round_trip).toBeDefined();
    expect(options(buildBody(base, "synthetic")).round_trip).toBeUndefined();
  });
});

describe("decodeCandidate", () => {
  const geojson = {
    features: [
      {
        geometry: {
          coordinates: [
            [14.5, 46.05, 300],
            [14.51, 46.06, 340],
            [14.5, 46.05, 300],
          ],
        },
        properties: {
          summary: { ascent: 40, descent: 40, distance: 5012, duration: 3600 },
        },
      },
    ],
  };

  it("reads the summary and closes the loop", () => {
    const candidate = decodeCandidate(geojson, 7);
    expect(candidate.seed).toBe(7);
    expect(candidate.stats.distanceM).toBe(5012);
    expect(candidate.stats.ascentM).toBe(40);
    expect(candidate.stats.loopGapM).toBeCloseTo(0, 6);
    expect(candidate.coords).toHaveLength(3);
  });

  it("falls back to measured length when the summary omits it", () => {
    const candidate = decodeCandidate(
      {
        features: [{ geometry: geojson.features[0].geometry, properties: {} }],
      },
      1
    );
    expect(candidate.stats.distanceM).toBeGreaterThan(0);
    // ascent/descent are absent unless elevation was requested — must not throw.
    expect(candidate.stats.ascentM).toBe(0);
  });

  it("pads 2D positions to [lon, lat, ele]", () => {
    const candidate = decodeCandidate(
      {
        features: [
          {
            geometry: {
              coordinates: [
                [14.5, 46.05],
                [14.51, 46.06],
              ],
            },
          },
        ],
      },
      1
    );
    expect(candidate.coords[0]).toEqual([14.5, 46.05, 0]);
  });

  it("raises RoutingFailed on empty geometry", () => {
    expect(() => decodeCandidate({ features: [] }, 1)).toThrow(RoutingFailed);
    expect(() => decodeCandidate({}, 1)).toThrow(RoutingFailed);
  });
});

describe("seedsFrom", () => {
  it("is deterministic and distinct", () => {
    expect(seedsFrom(1, 4)).toEqual(seedsFrom(1, 4));
    expect(new Set(seedsFrom(1, 4)).size).toBe(4);
  });
});

describe("isFootProfile", () => {
  it("classifies profiles", () => {
    expect(isFootProfile("foot-walking")).toBe(true);
    expect(isFootProfile("foot-hiking")).toBe(true);
    expect(isFootProfile("cycling-regular")).toBe(false);
  });
});
