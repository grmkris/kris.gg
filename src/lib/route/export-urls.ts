/**
 * Deep links into Google Maps and Apple Maps.
 *
 * Both are **lossy by construction** — neither URL scheme accepts a polyline, so
 * a generated route has to be squeezed into a handful of waypoints:
 *
 * - **Google** documents "up to three waypoints on mobile browsers, and a maximum
 *   of nine otherwise". Mobile is the realistic case for a route planner, so the
 *   default budget here is three.
 * - **Apple** gained real multi-stop support with the unified Maps URLs in
 *   iOS 18.4 / macOS 15.4 (repeat the `waypoint` param). The older
 *   `saddr`/`daddr` scheme has no waypoints and no cycling mode at all, so it is
 *   emitted only as a fallback.
 *
 * GPX (`gpx.ts`) remains the lossless path; these are for "open it on my phone".
 */

import { sampleAlong } from "./geo";
import type { Coord } from "./geo";

export type Activity = "run" | "walk" | "hike" | "bike";

/** Google's documented ceiling on mobile browsers. */
export const GOOGLE_WAYPOINTS_MOBILE = 3;
/** Google's documented ceiling everywhere else. */
export const GOOGLE_WAYPOINTS_DESKTOP = 9;

const GOOGLE_TRAVEL_MODE: Record<Activity, string> = {
  bike: "bicycling",
  hike: "walking",
  run: "walking",
  walk: "walking",
};

const APPLE_MODE: Record<Activity, string> = {
  bike: "cycling",
  hike: "walking",
  run: "walking",
  walk: "walking",
};

/** `lat,lon` — the order both providers expect, opposite to GeoJSON. */
const latLon = (coord: Coord): string =>
  `${coord[1].toFixed(6)},${coord[0].toFixed(6)}`;

/**
 * Evenly spaced interior points, at most `budget` of them. Even spacing beats
 * shape-preserving simplification here: the consumer re-routes between the
 * waypoints anyway, so what matters is pinning the route's general course.
 */
export const pickWaypoints = (
  coords: readonly Coord[],
  budget: number
): Coord[] => {
  if (budget <= 0 || coords.length <= 2) {
    return [];
  }

  const interior = coords.slice(1, -1);
  if (interior.length === 0) {
    return [];
  }
  if (budget === 1 || interior.length === 1) {
    return [interior[Math.floor(interior.length / 2)]];
  }

  return sampleAlong(interior, Math.min(budget, interior.length)).slice(
    0,
    budget
  );
};

export interface DeepLinkOptions {
  readonly coords: readonly Coord[];
  readonly activity: Activity;
  /** Defaults to Google's mobile ceiling; pass `GOOGLE_WAYPOINTS_DESKTOP` when
   *  the link is known to be opening on a desktop browser. */
  readonly waypointBudget?: number;
  /** Maps to Apple's `avoid=stairs`. Google's URL scheme has no equivalent. */
  readonly avoidStairs?: boolean;
}

export const googleMapsUrl = ({
  coords,
  activity,
  waypointBudget = GOOGLE_WAYPOINTS_MOBILE,
}: DeepLinkOptions): string => {
  if (coords.length === 0) {
    return "https://www.google.com/maps";
  }

  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = pickWaypoints(
    coords,
    Math.min(waypointBudget, GOOGLE_WAYPOINTS_DESKTOP)
  );

  const params = new URLSearchParams({
    api: "1",
    destination: latLon(destination),
    origin: latLon(origin),
    travelmode: GOOGLE_TRAVEL_MODE[activity],
  });

  if (waypoints.length > 0) {
    // Pipe-separated, and URLSearchParams will percent-encode the separator —
    // which Google accepts.
    params.set("waypoints", waypoints.map(latLon).join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

/**
 * Unified Maps URL (iOS 18.4+ / macOS 15.4+). `waypoint` is repeated rather than
 * delimited, so this cannot use a plain record with `URLSearchParams`.
 */
export const appleMapsUrl = ({
  coords,
  activity,
  waypointBudget = GOOGLE_WAYPOINTS_MOBILE,
  avoidStairs = false,
}: DeepLinkOptions): string => {
  if (coords.length === 0) {
    return "https://maps.apple.com/";
  }

  const params = new URLSearchParams();
  params.set("source", latLon(coords[0]));
  params.set("destination", latLon(coords[coords.length - 1]));

  for (const waypoint of pickWaypoints(coords, waypointBudget)) {
    params.append("waypoint", latLon(waypoint));
  }

  params.set("mode", APPLE_MODE[activity]);
  if (avoidStairs && activity !== "bike") {
    params.set("avoid", "stairs");
  }

  return `https://maps.apple.com/directions?${params.toString()}`;
};

/**
 * Pre-18.4 Apple Maps. No waypoints, and `dirflg` has no cycling value — bikes
 * degrade to walking directions between the endpoints, which for a loop means
 * very little. Kept only so old devices get *something*.
 */
export const appleMapsLegacyUrl = ({
  coords,
}: Pick<DeepLinkOptions, "coords">): string => {
  if (coords.length === 0) {
    return "https://maps.apple.com/";
  }

  const params = new URLSearchParams({
    daddr: latLon(coords[coords.length - 1]),
    // `w` is the only non-driving value that fits any of our activities; the
    // legacy scheme has no cycling mode, so bikes get walking directions.
    dirflg: "w",
    saddr: latLon(coords[0]),
  });

  return `https://maps.apple.com/?${params.toString()}`;
};
