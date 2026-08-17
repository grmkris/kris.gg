/**
 * Geometry helpers for generated routes. Pure — no network, no Effect, no DOM —
 * so everything here is directly unit-testable and safe on both sides of the
 * client/server boundary.
 *
 * Coordinate order is **[lon, lat]**, matching GeoJSON and OpenRouteService.
 * Overpass and Apple/Google deep links want lat,lon — convert at those seams
 * with `toLatLon`, never by reordering in place.
 */

/** A GeoJSON position: `[lon, lat]`, with optional elevation in metres. */
export type Coord = readonly [lon: number, lat: number, ele?: number];

/** `[west, south, east, north]` — GeoJSON bbox order. */
export type Bbox = readonly [number, number, number, number];

/** IUGG mean earth radius. */
const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export const haversineM = (a: Coord, b: Coord): number => {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[0] - a[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Summed great-circle length of a path in metres. */
export const pathLengthM = (coords: readonly Coord[]): number => {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    total += haversineM(coords[i - 1], coords[i]);
  }
  return total;
};

/**
 * Total positive elevation change. ORS reports `ascent` in its summary, but only
 * when `elevation: true` was requested — this is the fallback, and the check
 * that the summary is telling the truth.
 */
export const ascentM = (coords: readonly Coord[]): number => {
  let gain = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const previous = coords[i - 1][2];
    const current = coords[i][2];
    if (previous !== undefined && current !== undefined && current > previous) {
      gain += current - previous;
    }
  }
  return gain;
};

export const bboxOf = (coords: readonly Coord[]): Bbox => {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const [lon, lat] of coords) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }

  return [west, south, east, north];
};

/** `[lon, lat]` → `[lat, lon]`, for Overpass and map deep links. */
export const toLatLon = (coord: Coord): readonly [number, number] => [
  coord[1],
  coord[0],
];

/**
 * Local equirectangular projection to metres. Accurate enough for the
 * perpendicular-distance test below at city scale, and far cheaper than a
 * proper geodesic — simplification tolerances are metres, not millimetres.
 */
const project = (coord: Coord, cosLat0: number): readonly [number, number] => [
  toRadians(coord[0]) * cosLat0 * EARTH_RADIUS_M,
  toRadians(coord[1]) * EARTH_RADIUS_M,
];

const perpendicularDistanceM = (
  point: Coord,
  start: Coord,
  end: Coord,
  cosLat0: number
): number => {
  const [px, py] = project(point, cosLat0);
  const [sx, sy] = project(start, cosLat0);
  const [ex, ey] = project(end, cosLat0);

  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSq = dx * dx + dy * dy;

  // Degenerate segment — fall back to point distance.
  if (lengthSq === 0) {
    return Math.hypot(px - sx, py - sy);
  }

  // Clamped projection parameter, so points beyond either end measure to the
  // nearer endpoint rather than to the infinite line.
  const t = Math.max(
    0,
    Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSq)
  );

  return Math.hypot(px - (sx + t * dx), py - (sy + t * dy));
};

/**
 * Douglas–Peucker simplification with a metre tolerance.
 *
 * Iterative rather than recursive: a dense route can be tens of thousands of
 * points, and the recursive formulation would risk a stack overflow on exactly
 * the inputs we care about.
 */
export const simplify = (
  coords: readonly Coord[],
  toleranceM: number
): Coord[] => {
  if (coords.length <= 2) {
    return [...coords];
  }

  const cosLat0 = Math.cos(toRadians(coords[0][1]));
  const keep = new Array<boolean>(coords.length).fill(false);
  keep[0] = true;
  keep[coords.length - 1] = true;

  const stack: [number, number][] = [[0, coords.length - 1]];

  while (stack.length > 0) {
    const segment = stack.pop();
    if (segment === undefined) {
      break;
    }
    const [first, last] = segment;

    let furthest = -1;
    let maxDistance = 0;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistanceM(
        coords[i],
        coords[first],
        coords[last],
        cosLat0
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = i;
      }
    }

    if (furthest !== -1 && maxDistance > toleranceM) {
      keep[furthest] = true;
      stack.push([first, furthest], [furthest, last]);
    }
  }

  return coords.filter((_, index) => keep[index]);
};

/**
 * Simplify until the path fits `maxPoints`, by binary-searching the tolerance.
 *
 * Used before storing geometry in D1 (rows stay small) and before handing a line
 * to Overpass. Shape-preserving, unlike a fixed stride, which is why it is worth
 * the extra passes.
 */
export const downsampleTo = (
  coords: readonly Coord[],
  maxPoints: number
): Coord[] => {
  const limit = Math.max(2, maxPoints);
  if (coords.length <= limit) {
    return [...coords];
  }

  let low = 0;
  let high = 5000;
  let best = simplify(coords, high);

  for (let i = 0; i < 24 && high - low > 0.5; i += 1) {
    const mid = (low + high) / 2;
    const candidate = simplify(coords, mid);
    if (candidate.length > limit) {
      low = mid;
    } else {
      high = mid;
      best = candidate;
    }
  }

  return best;
};

/**
 * Pick at most `maxPoints` roughly evenly spaced along the path.
 *
 * Different job from `downsampleTo`: Overpass's `around:` filter wants even
 * *coverage* of the corridor, not a faithful outline — a simplified line drops
 * points on long straights, which is exactly where POIs would be missed.
 */
export const sampleAlong = (
  coords: readonly Coord[],
  maxPoints: number
): Coord[] => {
  const limit = Math.max(2, maxPoints);
  if (coords.length <= limit) {
    return [...coords];
  }

  const total = pathLengthM(coords);
  if (total === 0) {
    return [coords[0], coords[coords.length - 1]];
  }

  const step = total / (limit - 1);
  const picked: Coord[] = [coords[0]];
  let travelled = 0;
  let nextAt = step;

  for (let i = 1; i < coords.length - 1; i += 1) {
    travelled += haversineM(coords[i - 1], coords[i]);
    if (travelled >= nextAt && picked.length < limit - 1) {
      picked.push(coords[i]);
      nextAt += step;
    }
  }

  picked.push(coords[coords.length - 1]);
  return picked;
};

/**
 * How closely the path returns to its start, in metres. A generated "loop" that
 * does not close is a bug worth surfacing rather than quietly drawing.
 */
export const loopGapM = (coords: readonly Coord[]): number =>
  coords.length < 2 ? 0 : haversineM(coords[0], coords[coords.length - 1]);
