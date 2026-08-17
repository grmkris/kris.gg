import { describe, expect, it } from "bun:test";

import { estimateDurationS, formatDistance, formatDuration } from "./pace";

describe("estimateDurationS", () => {
  it("puts a flat 5km run near 27 minutes, not an hour", () => {
    // The whole point: ORS would report walking pace for the foot-walking
    // profile a run is routed on.
    const seconds = estimateDurationS("run", 5000);
    expect(seconds).toBeGreaterThan(24 * 60);
    expect(seconds).toBeLessThan(30 * 60);
  });

  it("orders activities sensibly over the same distance", () => {
    const flat = 10_000;
    expect(estimateDurationS("bike", flat)).toBeLessThan(
      estimateDurationS("run", flat)
    );
    expect(estimateDurationS("run", flat)).toBeLessThan(
      estimateDurationS("walk", flat)
    );
    expect(estimateDurationS("walk", flat)).toBeLessThan(
      estimateDurationS("hike", flat)
    );
  });

  it("adds time for climb", () => {
    expect(estimateDurationS("hike", 5000, 600)).toBeGreaterThan(
      estimateDurationS("hike", 5000, 0)
    );
  });

  it("ignores negative ascent", () => {
    expect(estimateDurationS("walk", 5000, -500)).toBe(
      estimateDurationS("walk", 5000, 0)
    );
  });
});

describe("formatDuration", () => {
  it("shows minutes under an hour", () => {
    expect(formatDuration(48 * 60)).toBe("48m");
  });

  it("shows hours and zero-padded minutes", () => {
    expect(formatDuration(3900)).toBe("1h 05m");
  });

  it("rolls 60 rounded minutes into the next hour", () => {
    expect(formatDuration(3599)).toBe("1h 00m");
  });

  it("clamps negatives", () => {
    expect(formatDuration(-10)).toBe("0m");
  });
});

describe("formatDistance", () => {
  it("renders kilometres to two places", () => {
    expect(formatDistance(5234)).toBe("5.23 km");
  });
});
