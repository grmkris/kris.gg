import { describe, expect, it } from "bun:test";

import {
  distanceErrorRatio,
  rankCandidates,
  withinDistanceTolerance,
} from "./rank";
import { RouteCandidate, RouteStats } from "./schema";

const candidate = (
  seed: number,
  distanceM: number,
  ascentM: number,
  loopGapM = 0
): RouteCandidate =>
  new RouteCandidate({
    bbox: [14.4, 46, 14.6, 46.1],
    coords: [
      [14.5, 46.05, 300],
      [14.51, 46.06, 310],
      [14.5, 46.05, 300],
    ],
    seed,
    stats: new RouteStats({
      ascentM,
      descentM: ascentM,
      distanceM,
      durationS: distanceM,
      loopGapM,
    }),
  });

describe("distanceErrorRatio", () => {
  it("is a fraction of the target", () => {
    expect(distanceErrorRatio(candidate(1, 5500, 0), 5000)).toBeCloseTo(0.1, 6);
    expect(distanceErrorRatio(candidate(1, 4500, 0), 5000)).toBeCloseTo(0.1, 6);
  });

  it("guards against a zero target", () => {
    expect(distanceErrorRatio(candidate(1, 5000, 0), 0)).toBe(0);
  });
});

describe("rankCandidates", () => {
  const spread = [
    candidate(1, 5000, 300), // exact distance, hilly
    candidate(2, 5400, 40), // slightly long, flat
    candidate(3, 7000, 20), // way long, flattest
  ];

  it("prefers the exact distance when asked for closest-distance", () => {
    const ranked = rankCandidates(spread, {
      rankBy: "closest-distance",
      targetM: 5000,
    });
    expect(ranked[0].candidate.seed).toBe(1);
  });

  it("prefers the flattest among candidates of equal distance", () => {
    const ranked = rankCandidates(
      [candidate(1, 5000, 300), candidate(2, 5000, 40), candidate(3, 5000, 90)],
      { rankBy: "flattest", targetM: 5000 }
    );
    expect(ranked[0].candidate.seed).toBe(2);
  });

  it("does not let flatness excuse a badly wrong distance", () => {
    // Seed 3 is the flattest but 40% over target; seed 2 is nearly as flat and
    // close to what was asked for. Distance still has to matter.
    const ranked = rankCandidates(spread, {
      rankBy: "flattest",
      targetM: 5000,
    });
    expect(ranked[0].candidate.seed).toBe(2);
  });

  it("prefers the hilliest when asked for hilliest", () => {
    const ranked = rankCandidates(spread, {
      rankBy: "hilliest",
      targetM: 5000,
    });
    expect(ranked[0].candidate.seed).toBe(1);
  });

  it("uses POI counts when ranking by most-pois", () => {
    const ranked = rankCandidates(spread, {
      poiCounts: [0, 9, 1],
      rankBy: "most-pois",
      targetM: 5000,
    });
    expect(ranked[0].candidate.seed).toBe(2);
    expect(ranked[0].poiCount).toBe(9);
  });

  it("returns every candidate, sorted best first", () => {
    const ranked = rankCandidates(spread, {
      rankBy: "balanced",
      targetM: 5000,
    });
    expect(ranked).toHaveLength(3);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i - 1].score);
    }
  });

  it("penalises a loop that does not close", () => {
    const ranked = rankCandidates(
      [candidate(1, 5000, 100, 900), candidate(2, 5000, 100, 0)],
      { rankBy: "balanced", targetM: 5000 }
    );
    expect(ranked[0].candidate.seed).toBe(2);
  });

  it("handles an empty set and a single candidate", () => {
    expect(rankCandidates([], { rankBy: "balanced", targetM: 5000 })).toEqual(
      []
    );
    const one = rankCandidates([candidate(1, 5000, 100)], {
      rankBy: "balanced",
      targetM: 5000,
    });
    expect(one).toHaveLength(1);
    expect(one[0].score).toBe(0);
  });
});

describe("withinDistanceTolerance", () => {
  it("drops candidates that missed badly", () => {
    const kept = withinDistanceTolerance(
      [candidate(1, 5000, 0), candidate(2, 9000, 0)],
      5000
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].seed).toBe(1);
  });

  it("never empties the set", () => {
    const all = [candidate(1, 20_000, 0), candidate(2, 30_000, 0)];
    expect(withinDistanceTolerance(all, 5000)).toHaveLength(2);
  });
});
