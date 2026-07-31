import { describe, expect, it } from "bun:test";
import {
  ascentM,
  bboxOf,
  type Coord,
  downsampleTo,
  haversineM,
  loopGapM,
  pathLengthM,
  sampleAlong,
  simplify,
  toLatLon,
} from "./geo";

/** A straight east-west run of points, dense enough to exercise simplification. */
const straightLine = (count: number): Coord[] =>
  Array.from(
    { length: count },
    (_, i) => [14.5 + i * 0.001, 46.05, 300] as const
  );

describe("haversineM", () => {
  it("measures a degree of latitude at roughly 111km", () => {
    const distance = haversineM([14.5, 46], [14.5, 47]);
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });

  it("is zero for identical points and symmetric", () => {
    expect(haversineM([14.5, 46], [14.5, 46])).toBe(0);
    expect(haversineM([14.5, 46], [14.6, 46.1])).toBeCloseTo(
      haversineM([14.6, 46.1], [14.5, 46]),
      6
    );
  });
});

describe("pathLengthM", () => {
  it("sums the segments", () => {
    const coords: Coord[] = [
      [14.5, 46],
      [14.5, 46.01],
      [14.5, 46.02],
    ];
    const total = pathLengthM(coords);
    const first = haversineM(coords[0], coords[1]);
    expect(total).toBeCloseTo(first * 2, 3);
  });

  it("is zero for degenerate paths", () => {
    expect(pathLengthM([])).toBe(0);
    expect(pathLengthM([[14.5, 46]])).toBe(0);
  });
});

describe("ascentM", () => {
  it("counts only positive elevation deltas", () => {
    const coords: Coord[] = [
      [14.5, 46, 100],
      [14.5, 46.01, 150],
      [14.5, 46.02, 120],
      [14.5, 46.03, 170],
    ];
    expect(ascentM(coords)).toBe(100);
  });

  it("ignores points with no elevation", () => {
    expect(
      ascentM([
        [14.5, 46],
        [14.5, 46.01],
      ])
    ).toBe(0);
  });
});

describe("bboxOf", () => {
  it("returns west, south, east, north", () => {
    expect(
      bboxOf([
        [14.5, 46],
        [14.7, 46.2],
        [14.4, 46.1],
      ])
    ).toEqual([14.4, 46, 14.7, 46.2]);
  });
});

describe("toLatLon", () => {
  it("flips GeoJSON order", () => {
    expect(toLatLon([14.5, 46.05])).toEqual([46.05, 14.5]);
  });
});

describe("simplify", () => {
  it("collapses a straight line to its endpoints", () => {
    const line = straightLine(50);
    const result = simplify(line, 5);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(line[0]);
    expect(result[1]).toEqual(line[49]);
  });

  it("keeps a point that deviates beyond the tolerance", () => {
    const coords: Coord[] = [
      [14.5, 46.05],
      [14.51, 46.06],
      [14.52, 46.05],
    ];
    expect(simplify(coords, 5)).toHaveLength(3);
    expect(simplify(coords, 5000)).toHaveLength(2);
  });

  it("passes short paths through untouched", () => {
    const coords: Coord[] = [
      [14.5, 46.05],
      [14.51, 46.05],
    ];
    expect(simplify(coords, 1)).toEqual(coords);
  });
});

describe("downsampleTo", () => {
  it("never exceeds the requested budget", () => {
    // A zig-zag: every point deviates, so nothing simplifies away for free.
    const zigzag: Coord[] = Array.from(
      { length: 500 },
      (_, i) => [14.5 + i * 0.001, 46.05 + (i % 2) * 0.001] as const
    );
    for (const budget of [2, 10, 60, 200]) {
      const result = downsampleTo(zigzag, budget);
      expect(result.length).toBeLessThanOrEqual(budget);
      expect(result.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves both endpoints", () => {
    const zigzag: Coord[] = Array.from(
      { length: 300 },
      (_, i) => [14.5 + i * 0.001, 46.05 + (i % 2) * 0.002] as const
    );
    const result = downsampleTo(zigzag, 20);
    expect(result[0]).toEqual(zigzag[0]);
    expect(result[result.length - 1]).toEqual(zigzag[299]);
  });

  it("returns the input when already small enough", () => {
    const line = straightLine(5);
    expect(downsampleTo(line, 50)).toEqual(line);
  });
});

describe("sampleAlong", () => {
  it("respects the budget and keeps the endpoints", () => {
    const line = straightLine(200);
    const result = sampleAlong(line, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result[0]).toEqual(line[0]);
    expect(result[result.length - 1]).toEqual(line[199]);
  });

  it("keeps points on a straight run, unlike simplify", () => {
    const line = straightLine(200);
    // This is the whole reason both functions exist.
    expect(simplify(line, 5)).toHaveLength(2);
    expect(sampleAlong(line, 20).length).toBeGreaterThan(2);
  });
});

describe("loopGapM", () => {
  it("is near zero for a closed loop", () => {
    const loop: Coord[] = [
      [14.5, 46.05],
      [14.51, 46.05],
      [14.51, 46.06],
      [14.5, 46.05],
    ];
    expect(loopGapM(loop)).toBeCloseTo(0, 6);
  });

  it("reports the gap for an open path", () => {
    expect(
      loopGapM([
        [14.5, 46],
        [14.5, 46.01],
      ])
    ).toBeGreaterThan(1000);
  });
});
