import { describe, expect, it } from "bun:test";

import type { Coord } from "@/lib/route/geo";

import {
  buildOverpassQuery,
  CORRIDOR_SAMPLES,
  fetchPois,
  parseOverpassResponse,
} from "./overpass";
import type { OverpassResponse } from "./overpass";

/** A dense line heading north from Ljubljana. */
const route: Coord[] = Array.from(
  { length: 400 },
  (_, i) => [14.5, 46.05 + i * 0.0002, 300] as const
);

describe("buildOverpassQuery", () => {
  it("emits lat,lon pairs — the opposite order to GeoJSON", () => {
    const query = buildOverpassQuery({ categories: ["cafe"], coords: route });
    // 46.05 is the latitude and must come first.
    expect(query).toContain("around:120,46.05000,14.50000");
  });

  it("samples the line down rather than sending every vertex", () => {
    const query = buildOverpassQuery({ categories: ["cafe"], coords: route });
    const pairs = (query.match(/\d+\.\d{5},\d+\.\d{5}/g) ?? []).length;
    expect(pairs).toBeLessThanOrEqual(CORRIDOR_SAMPLES);
    expect(pairs).toBeGreaterThan(2);
  });

  it("uses nwr and out center so ways and relations are usable", () => {
    const query = buildOverpassQuery({ categories: ["park"], coords: route });
    expect(query).toContain("nwr");
    expect(query).toContain("out center;");
  });

  it("emits one clause per category with the right tag", () => {
    const query = buildOverpassQuery({
      categories: ["cafe", "viewpoint", "drinking_water"],
      coords: route,
    });
    expect(query).toContain('["amenity"="cafe"]');
    expect(query).toContain('["tourism"="viewpoint"]');
    expect(query).toContain('["amenity"="drinking_water"]');
  });

  it("honours a custom radius and timeout", () => {
    const query = buildOverpassQuery({
      categories: ["cafe"],
      coords: route,
      radiusM: 300,
      timeoutS: 5,
    });
    expect(query).toContain("[timeout:5]");
    expect(query).toContain("around:300,");
  });
});

describe("parseOverpassResponse", () => {
  const body: OverpassResponse = {
    elements: [
      {
        id: 1,
        lat: 46.06,
        lon: 14.5,
        tags: { amenity: "cafe", name: "Kavarna" },
        type: "node",
      },
      {
        center: { lat: 46.07, lon: 14.5 },
        id: 2,
        tags: { leisure: "park", name: "Tivoli" },
        type: "way",
      },
      // No usable position — must be skipped, not crash.
      { id: 3, tags: { amenity: "cafe" }, type: "node" },
      // Not a requested category.
      { id: 4, lat: 46.06, lon: 14.5, tags: { amenity: "bank" }, type: "node" },
    ],
  };

  it("reads node lat/lon and way center alike", () => {
    const pois = parseOverpassResponse(body, route, ["cafe", "park"]);
    expect(pois).toHaveLength(2);
    expect(pois.map((poi) => poi.name)).toEqual(["Kavarna", "Tivoli"]);
  });

  it("tags each POI with how far along the route it sits", () => {
    const pois = parseOverpassResponse(body, route, ["cafe", "park"]);
    expect(pois[0].atMeters).toBeGreaterThan(0);
    // Sorted by position along the route, so the park (further north) is later.
    expect(pois[1].atMeters).toBeGreaterThan(pois[0].atMeters);
  });

  it("ignores categories that were not requested", () => {
    expect(parseOverpassResponse(body, route, ["viewpoint"])).toHaveLength(0);
  });

  it("dedupes by type/id", () => {
    const first = body.elements?.[0];
    const duplicated: OverpassResponse = {
      elements: [first ?? {}, first ?? {}],
    };
    expect(parseOverpassResponse(duplicated, route, ["cafe"])).toHaveLength(1);
  });

  it("survives an empty or malformed body", () => {
    expect(parseOverpassResponse({}, route, ["cafe"])).toEqual([]);
    expect(parseOverpassResponse({ elements: [] }, route, ["cafe"])).toEqual(
      []
    );
  });
});

describe("fetchPois", () => {
  it("returns nothing without categories or geometry", async () => {
    expect(await fetchPois({ categories: [], coords: route })).toEqual([]);
    expect(await fetchPois({ categories: ["cafe"], coords: [] })).toEqual([]);
  });

  it("degrades to an empty list when Overpass errors", async () => {
    const pois = await fetchPois({
      categories: ["cafe"],
      coords: route,
      fetchImpl: () => Promise.resolve(new Response("busy", { status: 429 })),
    });
    expect(pois).toEqual([]);
  });

  it("degrades to an empty list when the network throws", async () => {
    const pois = await fetchPois({
      categories: ["cafe"],
      coords: route,
      fetchImpl: () => Promise.reject(new Error("offline")),
    });
    expect(pois).toEqual([]);
  });

  it("parses a successful response and applies the limit", async () => {
    const elements = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      lat: 46.05 + i * 0.0001,
      lon: 14.5,
      tags: { amenity: "cafe", name: `Cafe ${i}` },
      type: "node",
    }));

    const pois = await fetchPois({
      categories: ["cafe"],
      coords: route,
      fetchImpl: () =>
        Promise.resolve(Response.json({ elements }, { status: 200 })),
      limit: 10,
    });

    expect(pois).toHaveLength(10);
    expect(pois[0].category).toBe("cafe");
  });
});
