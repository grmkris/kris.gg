import { describe, expect, it } from "bun:test";
import {
  appleMapsLegacyUrl,
  appleMapsUrl,
  GOOGLE_WAYPOINTS_DESKTOP,
  GOOGLE_WAYPOINTS_MOBILE,
  googleMapsUrl,
  pickWaypoints,
} from "./export-urls";
import type { Coord } from "./geo";

/** A dense closed loop, the shape the planner actually produces. */
const loop: Coord[] = Array.from({ length: 240 }, (_, i) => {
  const angle = (i / 239) * 2 * Math.PI;
  return [
    14.5 + 0.01 * Math.cos(angle),
    46.05 + 0.01 * Math.sin(angle),
    300,
  ] as const;
});

describe("pickWaypoints", () => {
  it("returns at most the budget", () => {
    expect(pickWaypoints(loop, 3)).toHaveLength(3);
    expect(pickWaypoints(loop, 9)).toHaveLength(9);
  });

  it("excludes the endpoints", () => {
    const picked = pickWaypoints(loop, 3);
    expect(picked).not.toContainEqual(loop[0]);
    expect(picked).not.toContainEqual(loop[loop.length - 1]);
  });

  it("degrades gracefully on tiny inputs", () => {
    expect(pickWaypoints([], 3)).toEqual([]);
    expect(pickWaypoints([[14.5, 46]], 3)).toEqual([]);
    expect(
      pickWaypoints(
        [
          [14.5, 46],
          [14.6, 46],
        ],
        3
      )
    ).toEqual([]);
  });
});

describe("googleMapsUrl", () => {
  it("defaults to the documented mobile ceiling of three waypoints", () => {
    const url = new URL(googleMapsUrl({ activity: "run", coords: loop }));
    const waypoints = url.searchParams.get("waypoints")?.split("|") ?? [];
    expect(waypoints).toHaveLength(GOOGLE_WAYPOINTS_MOBILE);
  });

  it("never exceeds the desktop ceiling even if asked to", () => {
    const url = new URL(
      googleMapsUrl({ activity: "run", coords: loop, waypointBudget: 50 })
    );
    const waypoints = url.searchParams.get("waypoints")?.split("|") ?? [];
    expect(waypoints).toHaveLength(GOOGLE_WAYPOINTS_DESKTOP);
  });

  it("maps activities to travel modes", () => {
    const modeFor = (activity: "bike" | "hike" | "run" | "walk"): string => {
      const url = new URL(googleMapsUrl({ activity, coords: loop }));
      return url.searchParams.get("travelmode") ?? "";
    };
    expect(modeFor("run")).toBe("walking");
    expect(modeFor("walk")).toBe("walking");
    expect(modeFor("hike")).toBe("walking");
    expect(modeFor("bike")).toBe("bicycling");
  });

  it("puts origin and destination in lat,lon order", () => {
    const url = new URL(googleMapsUrl({ activity: "run", coords: loop }));
    const origin = url.searchParams.get("origin") ?? "";
    const [lat, lon] = origin.split(",").map(Number);
    expect(lat).toBeCloseTo(loop[0][1], 5);
    expect(lon).toBeCloseTo(loop[0][0], 5);
  });

  it("survives an empty route", () => {
    expect(googleMapsUrl({ activity: "run", coords: [] })).toBe(
      "https://www.google.com/maps"
    );
  });
});

describe("appleMapsUrl", () => {
  it("repeats the waypoint parameter rather than delimiting it", () => {
    const url = new URL(appleMapsUrl({ activity: "walk", coords: loop }));
    expect(url.searchParams.getAll("waypoint")).toHaveLength(3);
    expect(url.pathname).toBe("/directions");
  });

  it("uses cycling for bikes, unlike the legacy scheme", () => {
    const url = new URL(appleMapsUrl({ activity: "bike", coords: loop }));
    expect(url.searchParams.get("mode")).toBe("cycling");
  });

  it("only sets avoid=stairs for foot activities", () => {
    const walking = new URL(
      appleMapsUrl({ activity: "walk", avoidStairs: true, coords: loop })
    );
    expect(walking.searchParams.get("avoid")).toBe("stairs");

    const cycling = new URL(
      appleMapsUrl({ activity: "bike", avoidStairs: true, coords: loop })
    );
    expect(cycling.searchParams.get("avoid")).toBeNull();
  });
});

describe("appleMapsLegacyUrl", () => {
  it("carries no waypoints", () => {
    const url = new URL(appleMapsLegacyUrl({ coords: loop }));
    expect(url.searchParams.getAll("waypoint")).toHaveLength(0);
    expect(url.searchParams.get("dirflg")).toBe("w");
    expect(url.searchParams.get("saddr")).not.toBeNull();
    expect(url.searchParams.get("daddr")).not.toBeNull();
  });
});
