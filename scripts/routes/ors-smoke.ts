/**
 * Decides which loop strategy this deployment gets.
 *
 * `options.round_trip` is the mechanism the whole planner leans on — it is the
 * Strava-style "give me a 5 km loop" generator, and re-rolling its `seed` is the
 * entire Generate Again feature. But whether the public ORS instance enables it
 * is a *per-profile server config* (`maximum_distance_round_trip_routes`) that
 * cannot be read from the outside, and the request model carries no `validWhen`
 * restriction either way. So: measure, don't infer.
 *
 * Run once with a real key before trusting `strategy: "round-trip"`:
 *
 *   ORS_API_KEY=... bun run scripts/routes/ors-smoke.ts
 *
 * Imports the pure builder rather than `src/planner/ors.ts`, which is
 * `server-only` and would throw in a plain script.
 */

import { loopGapM, pathLengthM } from "../../src/lib/route/geo";
import { buildBody, decodeCandidate } from "../../src/planner/ors-request";
import type {
  LoopStrategy,
  OrsGeoJson,
  OrsRouteRequest,
} from "../../src/planner/ors-request";
import type { RouteProfile } from "../../src/planner/schema";

const ORS_BASE = "https://api.heigit.org/openrouteservice/v2/directions";

/** Ljubljana centre — hilly enough that a zero ascent is itself a red flag. */
const START = { lat: 46.0511, lon: 14.5051 };
const TARGET_M = 5000;

const PROFILES: RouteProfile[] = [
  "foot-walking",
  "foot-hiking",
  "cycling-regular",
];

const apiKey = process.env.ORS_API_KEY;
if (apiKey === undefined || apiKey === "") {
  process.stderr.write(
    "Missing ORS_API_KEY. Register at https://account.heigit.org, then:\n" +
      "  ORS_API_KEY=... bun run scripts/routes/ors-smoke.ts\n"
  );
  process.exit(1);
}

const request = (profile: RouteProfile, seed: number): OrsRouteRequest => ({
  avoidFeatures: [],
  green: null,
  lengthM: TARGET_M,
  points: 4,
  profile,
  quiet: null,
  seed,
  start: START,
  steepnessDifficulty: null,
});

interface Attempt {
  readonly ascentM: number;
  readonly distanceM: number;
  readonly gapM: number;
  readonly points: number;
}

const attempt = async (
  profile: RouteProfile,
  strategy: LoopStrategy,
  seed: number
): Promise<Attempt | string> => {
  const response = await fetch(`${ORS_BASE}/${profile}/geojson`, {
    body: JSON.stringify(buildBody(request(profile, seed), strategy)),
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
  }

  const candidate = decodeCandidate(
    (await response.json()) as OrsGeoJson,
    seed
  );

  return {
    ascentM: candidate.stats.ascentM,
    distanceM: candidate.stats.distanceM || pathLengthM(candidate.coords),
    gapM: loopGapM(candidate.coords),
    points: candidate.coords.length,
  };
};

const pct = (value: number): string =>
  `${((value / TARGET_M - 1) * 100).toFixed(1)}%`;

const report = (label: string, result: Attempt | string): boolean => {
  if (typeof result === "string") {
    process.stdout.write(`  ${label.padEnd(22)} FAIL  ${result}\n`);
    return false;
  }
  const ok =
    Math.abs(result.distanceM / TARGET_M - 1) < 0.35 && result.gapM < 250;
  process.stdout.write(
    `  ${label.padEnd(22)} ${ok ? "ok  " : "WARN"}  ` +
      `${(result.distanceM / 1000).toFixed(2)}km (${pct(result.distanceM)})  ` +
      `+${result.ascentM.toFixed(0)}m  gap ${result.gapM.toFixed(0)}m  ` +
      `${result.points}pts\n`
  );
  return ok;
};

const supported: RouteProfile[] = [];

for (const profile of PROFILES) {
  process.stdout.write(`\n${profile}\n`);

  const roundTrip = await attempt(profile, "round-trip", 1);
  if (report("round_trip", roundTrip)) {
    supported.push(profile);
  }

  // Different seed must yield a genuinely different line, or the dice button is
  // decorative.
  const reroll = await attempt(profile, "round-trip", 20_260_731);
  report("round_trip (reseed)", reroll);
  if (typeof roundTrip !== "string" && typeof reroll !== "string") {
    const identical = roundTrip.distanceM === reroll.distanceM;
    process.stdout.write(
      `  ${"reseed differs".padEnd(22)} ${identical ? "WARN  seed appears ignored" : "ok"}\n`
    );
  }

  report("synthetic fallback", await attempt(profile, "synthetic", 1));
}

const named = supported.length > 0 ? ` (${supported.join(", ")})` : "";
const advice =
  supported.length === PROFILES.length
    ? "Use strategy: 'round-trip'."
    : "Set strategy: 'synthetic' for the profiles above that failed.";

process.stdout.write(
  `\nVERDICT: round_trip usable on ${supported.length}/${PROFILES.length} profiles${named}.\n${advice}\n`
);
