/**
 * GPX 1.1 serialisation.
 *
 * This is the only *lossless* export: the Google and Apple deep links are capped
 * at a handful of waypoints (see `export-urls.ts`), so GPX is what actually
 * carries the generated route into Strava, Garmin, Komoot and friends.
 */

import type { Coord } from "./geo";

const XML_ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
};

const escapeXml = (value: string): string =>
  value.replaceAll(
    /["&'<>]/g,
    (character) => XML_ESCAPES[character] ?? character
  );

/** Coordinates carry more precision than any consumer needs; 7dp is ~1cm. */
const fixed = (value: number, places: number): string =>
  Number.parseFloat(value.toFixed(places)).toString();

export interface GpxOptions {
  readonly coords: readonly Coord[];
  readonly name: string;
  /** ISO-8601 timestamp. Passed in rather than read from the clock so the
   *  output is deterministic and testable. */
  readonly time?: string;
}

export const toGpx = ({ coords, name, time }: GpxOptions): string => {
  const points = coords
    .map((coord) => {
      const [lon, lat, ele] = coord;
      const open = `      <trkpt lat="${fixed(lat, 7)}" lon="${fixed(lon, 7)}">`;
      const elevation = ele === undefined ? "" : `<ele>${fixed(ele, 2)}</ele>`;
      return `${open}${elevation}</trkpt>`;
    })
    .join("\n");

  const metadataTime = time === undefined ? "" : `\n    <time>${time}</time>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="kris.gg" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>${metadataTime}
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
};

/** Filesystem-safe filename for a downloaded route. */
export const gpxFilename = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return `${slug === "" ? "route" : slug}.gpx`;
};
