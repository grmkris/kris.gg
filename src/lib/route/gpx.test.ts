import { describe, expect, it } from "bun:test";
import type { Coord } from "./geo";
import { gpxFilename, toGpx } from "./gpx";

const coords: Coord[] = [
  [14.5, 46.05, 298.4],
  [14.51, 46.06, 305.2],
  [14.5, 46.05, 298.4],
];

describe("toGpx", () => {
  it("emits a well-formed GPX 1.1 document", () => {
    const gpx = toGpx({ coords, name: "Morning loop" });
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(gpx).toContain('version="1.1"');
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(gpx.trimEnd().endsWith("</gpx>")).toBe(true);
  });

  it("writes one trkpt per coordinate, in lat/lon attribute order", () => {
    const gpx = toGpx({ coords, name: "Morning loop" });
    const points = gpx.match(/<trkpt /g) ?? [];
    expect(points).toHaveLength(3);
    expect(gpx).toContain('<trkpt lat="46.05" lon="14.5">');
  });

  it("includes elevation when present and omits it when absent", () => {
    expect(toGpx({ coords, name: "x" })).toContain("<ele>298.4</ele>");
    expect(
      toGpx({
        coords: [
          [14.5, 46.05],
          [14.51, 46.06],
        ],
        name: "x",
      })
    ).not.toContain("<ele>");
  });

  it("escapes XML metacharacters in the name", () => {
    const gpx = toGpx({ coords, name: `Ben & Jerry's <"run">` });
    expect(gpx).toContain("Ben &amp; Jerry&apos;s &lt;&quot;run&quot;&gt;");
    expect(gpx).not.toContain(`<"run">`);
  });

  it("emits metadata time only when supplied", () => {
    expect(
      toGpx({ coords, name: "x", time: "2026-07-31T06:00:00Z" })
    ).toContain("<time>2026-07-31T06:00:00Z</time>");
    expect(toGpx({ coords, name: "x" })).not.toContain("<time>");
  });
});

describe("gpxFilename", () => {
  it("slugifies", () => {
    expect(gpxFilename("Morning Loop — Ljubljana")).toBe(
      "morning-loop-ljubljana.gpx"
    );
  });

  it("falls back when nothing survives slugification", () => {
    expect(gpxFilename("———")).toBe("route.gpx");
  });
});
