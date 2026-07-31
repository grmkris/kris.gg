/**
 * Overpass (OpenStreetMap) POI lookup along a generated route.
 *
 * No `server-only` guard here deliberately: Overpass needs no key, so this
 * module holds no secret worth protecting. It still only ever runs server-side
 * — nothing in `api.ts` imports it — and keeping it plain makes the query
 * builder and parser directly testable.
 *
 * Notes that shaped this:
 * - Overpass `around:` takes **lat,lon** pairs, the opposite of the `[lon,lat]`
 *   used everywhere else. `toLatLon` is the only sanctioned conversion.
 * - The maximum coordinate count for a polyline `around:` filter is undocumented;
 *   the wiki only warns that many pairs are slow. Routes routinely have
 *   thousands of vertices, so the line is sampled down first — and sampled
 *   *evenly* (`sampleAlong`), not simplified, because simplification drops
 *   points on long straights, which is exactly where POIs would be missed.
 * - It is a shared free service under a ~10k/day fair-use policy. Send a
 *   User-Agent, keep the corridor tight, and never let a POI failure fail a
 *   route — the geometry is the product, POIs are garnish.
 */

import { type Coord, haversineM, sampleAlong, toLatLon } from "@/lib/route/geo";
import { Poi, type PoiCategory } from "./schema";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Identifies us to a shared free service, as its fair-use policy asks. */
const USER_AGENT = "kris.gg route planner (+https://kris.gg)";

/** How many points of the route to anchor the corridor query on. */
export const CORRIDOR_SAMPLES = 60;

/** OSM tag selector per category. */
const CATEGORY_TAGS: Record<PoiCategory, string> = {
  artwork: '["tourism"="artwork"]',
  bakery: '["shop"="bakery"]',
  cafe: '["amenity"="cafe"]',
  drinking_water: '["amenity"="drinking_water"]',
  park: '["leisure"="park"]',
  toilets: '["amenity"="toilets"]',
  viewpoint: '["tourism"="viewpoint"]',
};

export type OverpassOptions = {
  readonly categories: readonly PoiCategory[];
  readonly coords: readonly Coord[];
  /** Corridor half-width in metres. */
  readonly radiusM?: number;
  readonly timeoutS?: number;
};

/**
 * Build the Overpass QL query. `nwr` rather than `node` because parks and many
 * cafés are mapped as ways or relations; `out center` then gives every result a
 * single representative point regardless of type.
 */
export const buildOverpassQuery = ({
  categories,
  coords,
  radiusM = 120,
  timeoutS = 30,
}: OverpassOptions): string => {
  const anchors = sampleAlong(coords, CORRIDOR_SAMPLES)
    .map((coord) => {
      const [lat, lon] = toLatLon(coord);
      return `${lat.toFixed(5)},${lon.toFixed(5)}`;
    })
    .join(",");

  const clauses = categories
    .map(
      (category) =>
        `  nwr${CATEGORY_TAGS[category]}(around:${radiusM},${anchors});`
    )
    .join("\n");

  return `[out:json][timeout:${timeoutS}];\n(\n${clauses}\n);\nout center;`;
};

type OverpassElement = {
  readonly center?: { readonly lat?: number; readonly lon?: number };
  readonly id?: number;
  readonly lat?: number;
  readonly lon?: number;
  readonly tags?: Record<string, string>;
  readonly type?: string;
};

export type OverpassResponse = {
  readonly elements?: readonly OverpassElement[];
};

/** Which requested category an element satisfies. First match wins. */
const categoryOf = (
  tags: Record<string, string>,
  categories: readonly PoiCategory[]
): PoiCategory | undefined =>
  categories.find((category) => {
    switch (category) {
      case "artwork":
        return tags.tourism === "artwork";
      case "bakery":
        return tags.shop === "bakery";
      case "cafe":
        return tags.amenity === "cafe";
      case "drinking_water":
        return tags.amenity === "drinking_water";
      case "park":
        return tags.leisure === "park";
      case "toilets":
        return tags.amenity === "toilets";
      default:
        return tags.tourism === "viewpoint";
    }
  });

/** Cumulative distance to each vertex, so a POI can be placed along the route. */
const cumulativeDistances = (coords: readonly Coord[]): number[] => {
  const totals = [0];
  for (let i = 1; i < coords.length; i += 1) {
    totals.push(totals[i - 1] + haversineM(coords[i - 1], coords[i]));
  }
  return totals;
};

/**
 * Decode elements into `Poi`s, tagging each with how far along the route it
 * sits. "2.4 km in" is what makes an explanation concrete ("coffee at the
 * halfway point") rather than a bare list of names.
 */
export const parseOverpassResponse = (
  body: OverpassResponse,
  coords: readonly Coord[],
  categories: readonly PoiCategory[]
): Poi[] => {
  const totals = cumulativeDistances(coords);
  const seen = new Set<string>();
  const pois: Poi[] = [];

  for (const element of body.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (lat === undefined || lon === undefined) {
      continue;
    }

    const category = categoryOf(element.tags ?? {}, categories);
    if (category === undefined) {
      continue;
    }

    const id = `${element.type ?? "node"}/${element.id ?? 0}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    // Nearest route vertex — good enough at 120m corridor width, and far
    // cheaper than projecting onto every segment.
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < coords.length; i += 1) {
      const distance = haversineM(coords[i], [lon, lat]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }

    pois.push(
      new Poi({
        atMeters: totals[nearest] ?? 0,
        category,
        id,
        lat,
        lon,
        name: element.tags?.name ?? null,
      })
    );
  }

  return pois.sort((a, b) => a.atMeters - b.atMeters);
};

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Fetch POIs along the route. **Never throws** — an Overpass outage, a timeout
 * or a rate-limit must degrade to "no POIs", not to a failed route.
 */
export const fetchPois = async (
  options: OverpassOptions & {
    readonly endpoint?: string;
    readonly fetchImpl?: FetchLike;
    readonly limit?: number;
  }
): Promise<Poi[]> => {
  if (options.categories.length === 0 || options.coords.length < 2) {
    return [];
  }

  const doFetch = options.fetchImpl ?? fetch;
  const query = buildOverpassQuery(options);

  try {
    const response = await doFetch(options.endpoint ?? OVERPASS_ENDPOINT, {
      body: new URLSearchParams({ data: query }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      method: "POST",
    });

    if (!response.ok) {
      return [];
    }

    const parsed = parseOverpassResponse(
      (await response.json()) as OverpassResponse,
      options.coords,
      options.categories
    );

    return parsed.slice(0, options.limit ?? 40);
  } catch {
    return [];
  }
};
