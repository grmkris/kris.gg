import "server-only";

/**
 * OpenRouteService transport — the half that holds the API key and touches the
 * network. All request construction and response decoding lives in
 * `ors-request.ts` so it stays unit-testable (this module cannot even be
 * imported outside a server context).
 *
 * **Host:** `api.openrouteservice.org` is retired on 2026-08-24 in favour of
 * `api.heigit.org`, so this targets the replacement from the start. Keys come
 * from account.heigit.org and are JWTs, passed in a bare `Authorization` header
 * with no `Bearer ` prefix.
 *
 * Free tier: 2000 directions/day, 40/min on a sliding window. A generate call
 * costs K (4) of those.
 */

import {
  buildBody,
  decodeCandidate,
  type LoopStrategy,
  type OrsGeoJson,
  type OrsRouteRequest,
  seedsFrom,
} from "./ors-request";
import { type RouteCandidate, RoutingFailed } from "./schema";

const ORS_BASE = "https://api.heigit.org/openrouteservice/v2/directions";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export const orsApiKey = (): string => {
  const key = process.env.ORS_API_KEY;
  if (key === undefined || key === "") {
    throw new RoutingFailed({
      message:
        "Missing ORS_API_KEY. Register at https://account.heigit.org to get one.",
    });
  }
  return key;
};

export type FetchOptions = {
  readonly apiKey: string;
  readonly fetchImpl?: FetchLike;
  readonly strategy?: LoopStrategy;
};

/** One ORS call. Throws `RoutingFailed` for anything the caller cannot fix. */
export const fetchCandidate = async (
  request: OrsRouteRequest,
  options: FetchOptions
): Promise<RouteCandidate> => {
  const doFetch = options.fetchImpl ?? fetch;
  const body = buildBody(request, options.strategy ?? "round-trip");

  let response: Response;
  try {
    response = await doFetch(`${ORS_BASE}/${request.profile}/geojson`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: options.apiKey,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (cause) {
    throw new RoutingFailed({
      message: `Could not reach OpenRouteService: ${String(cause)}`,
    });
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new RoutingFailed({
      message: `OpenRouteService ${response.status}: ${detail}`,
    });
  }

  return decodeCandidate((await response.json()) as OrsGeoJson, request.seed);
};

/**
 * Generate K candidates concurrently — the mechanism behind Generate Again and
 * every refine chip.
 *
 * Individual failures are tolerated: one unlucky seed should not lose the batch,
 * and four requests sit comfortably inside the 40/min budget. Only a total
 * wipeout raises, and it re-raises the first real error rather than a generic
 * one so quota and key problems stay legible.
 */
export const fetchCandidates = async (
  request: Omit<OrsRouteRequest, "seed">,
  options: FetchOptions & {
    readonly count?: number;
    readonly seedBase?: number;
  }
): Promise<RouteCandidate[]> => {
  const seeds = seedsFrom(options.seedBase ?? 1, options.count ?? 4);

  const settled = await Promise.allSettled(
    seeds.map((seed) => fetchCandidate({ ...request, seed }, options))
  );

  const candidates = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  if (candidates.length === 0) {
    const firstRejection = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    throw firstRejection?.reason instanceof RoutingFailed
      ? firstRejection.reason
      : new RoutingFailed({ message: "Every routing attempt failed." });
  }

  return candidates;
};
