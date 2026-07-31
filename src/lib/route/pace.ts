/**
 * Duration estimates per activity.
 *
 * ORS returns a duration for the *profile*, not the activity — and runs, walks
 * and hikes all route on `foot-walking`/`foot-hiking`. Taking ORS at its word
 * would tell someone their 5 km run takes an hour. So distance and climb are
 * converted here instead, and the ORS figure is ignored for display.
 *
 * Hiking additionally applies Naismith's rule (the classic allowance of about
 * an hour per 600 m of ascent), because on a hike the climb dominates.
 */

export type PacedActivity = "run" | "walk" | "hike" | "bike";

/** Flat-ground seconds per kilometre. */
const SECONDS_PER_KM: Record<PacedActivity, number> = {
  bike: 200, // ~18 km/h, casual
  hike: 900, // ~4 km/h over rough ground
  run: 330, // 5:30 min/km
  walk: 720, // ~5 km/h
};

/** Naismith: +1 hour per 600m of ascent, applied to walking activities. */
const ASCENT_SECONDS_PER_M: Record<PacedActivity, number> = {
  bike: 3,
  hike: 6,
  run: 4,
  walk: 6,
};

export const estimateDurationS = (
  activity: PacedActivity,
  distanceM: number,
  ascentM = 0
): number =>
  Math.round(
    (distanceM / 1000) * SECONDS_PER_KM[activity] +
      Math.max(0, ascentM) * ASCENT_SECONDS_PER_M[activity]
  );

/** "1h 05m" / "48m" — compact enough for a stat row. */
export const formatDuration = (seconds: number): string => {
  // Round to whole minutes *first*. Rounding the remainder separately lets 3599s
  // land on "60m" instead of "1h 00m".
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours === 0
    ? `${minutes}m`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

/** "5.2 km" */
export const formatDistance = (metres: number): string =>
  `${(metres / 1000).toFixed(2)} km`;
