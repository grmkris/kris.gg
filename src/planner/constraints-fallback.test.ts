import { describe, expect, it } from "bun:test";

import {
  fallbackConstraints,
  pointsForDistance,
  sanitizeConstraints,
} from "./constraints-fallback";
import type { Activity, Mood, RouteInputs } from "./schema";

const inputs = (
  activity: Activity,
  mood: Mood,
  distanceKm = 5
): RouteInputs => ({
  activity,
  distanceKm,
  mood,
  start: { lat: 46.05, lon: 14.5 },
});

describe("fallbackConstraints", () => {
  it("maps activities to ORS profiles", () => {
    expect(fallbackConstraints(inputs("run", "scenic")).profile).toBe(
      "foot-walking"
    );
    expect(fallbackConstraints(inputs("walk", "scenic")).profile).toBe(
      "foot-walking"
    );
    expect(fallbackConstraints(inputs("hike", "scenic")).profile).toBe(
      "foot-hiking"
    );
    expect(fallbackConstraints(inputs("bike", "scenic")).profile).toBe(
      "cycling-regular"
    );
  });

  it("sets green/quiet for foot and never for cycling", () => {
    const onFoot = fallbackConstraints(inputs("run", "nature"));
    expect(onFoot.green).toBeGreaterThan(0);
    expect(onFoot.quiet).toBeGreaterThan(0);
    expect(onFoot.steepnessDifficulty).toBeNull();

    const onBike = fallbackConstraints(inputs("bike", "nature"));
    expect(onBike.green).toBeNull();
    expect(onBike.quiet).toBeNull();
    expect(onBike.steepnessDifficulty).not.toBeNull();
  });

  it("converts km to metres", () => {
    expect(fallbackConstraints(inputs("run", "fast", 7.5)).lengthM).toBe(7500);
  });

  it("picks a ranking criterion from the mood", () => {
    expect(fallbackConstraints(inputs("run", "fast")).rankBy).toBe(
      "closest-distance"
    );
    expect(fallbackConstraints(inputs("walk", "tourist")).rankBy).toBe(
      "most-pois"
    );
  });

  it("avoids steps for runs and rides but not for walks and hikes", () => {
    expect(
      fallbackConstraints(inputs("run", "scenic")).avoidFeatures
    ).toContain("steps");
    expect(
      fallbackConstraints(inputs("bike", "scenic")).avoidFeatures
    ).toContain("steps");
    expect(
      fallbackConstraints(inputs("hike", "scenic")).avoidFeatures
    ).not.toContain("steps");
  });

  it("always avoids ferries, which would break a loop", () => {
    for (const activity of ["run", "walk", "hike", "bike"] as const) {
      expect(
        fallbackConstraints(inputs(activity, "scenic")).avoidFeatures
      ).toContain("ferries");
    }
  });

  it("suggests POI categories for the mood", () => {
    expect(
      fallbackConstraints(inputs("walk", "tourist")).poiCategories
    ).toContain("cafe");
    expect(
      fallbackConstraints(inputs("run", "nature")).poiCategories
    ).toContain("park");
  });
});

describe("pointsForDistance", () => {
  it("stays inside the range ORS accepts", () => {
    for (const km of [0.5, 1, 5, 20, 100, 500]) {
      const points = pointsForDistance(km);
      expect(points).toBeGreaterThanOrEqual(3);
      expect(points).toBeLessThanOrEqual(8);
    }
  });

  it("uses more waypoints for longer routes", () => {
    expect(pointsForDistance(20)).toBeGreaterThan(pointsForDistance(2));
  });
});

describe("sanitizeConstraints", () => {
  const base = fallbackConstraints(inputs("run", "scenic"));

  it("strips foot-only weightings from a cycling profile", () => {
    const cleaned = sanitizeConstraints(
      { ...base, green: 0.9, profile: "cycling-regular", quiet: 0.9 },
      inputs("bike", "scenic")
    );
    expect(cleaned.green).toBeNull();
    expect(cleaned.quiet).toBeNull();
  });

  it("strips cycling-only steepness from a foot profile", () => {
    const cleaned = sanitizeConstraints(
      { ...base, profile: "foot-hiking", steepnessDifficulty: 3 },
      inputs("hike", "scenic")
    );
    expect(cleaned.steepnessDifficulty).toBeNull();
  });

  it("pins distance to what the user asked for, not what the model said", () => {
    const cleaned = sanitizeConstraints(
      { ...base, lengthM: 99_000 },
      inputs("run", "scenic", 5)
    );
    expect(cleaned.lengthM).toBe(5000);
  });

  it("clamps out-of-range values", () => {
    const cleaned = sanitizeConstraints(
      { ...base, green: 5, points: 99, quiet: -2 },
      inputs("run", "scenic")
    );
    expect(cleaned.green).toBe(1);
    expect(cleaned.quiet).toBe(0);
    expect(cleaned.points).toBe(8);

    const bike = sanitizeConstraints(
      { ...base, profile: "cycling-regular", steepnessDifficulty: 42 },
      inputs("bike", "scenic")
    );
    expect(bike.steepnessDifficulty).toBe(3);
  });
});
