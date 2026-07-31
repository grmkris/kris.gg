"use client";

/**
 * The route map.
 *
 * MapLibre touches `window` at module scope and needs WebGL2, so this component
 * is only ever reached through `next/dynamic` with `ssr: false` — the same guard
 * `src/components/photo-gallery.tsx` uses for the lightbox. Importing it eagerly
 * would break the build, not just the render.
 *
 * Tiles come from OpenFreeMap: no key, no account, no usage cliff. Its
 * attribution ("OpenFreeMap © OpenMapTiles Data from OpenStreetMap") is
 * *required* and MapLibre renders it from the style JSON, so the attribution
 * control is deliberately left enabled.
 */

import type { Feature, FeatureCollection, LineString, Point } from "geojson";
// v6 is ESM-only and publishes named exports — there is no default export.
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import type { Bbox, Poi, Position } from "@/planner/schema";

const STYLE_URL = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

const LINE_SOURCE = "route-line";
const POI_SOURCE = "route-pois";

export interface RouteMapProps {
  readonly bbox: Bbox;
  readonly coords: readonly Position[];
  readonly pois?: readonly Poi[];
}

const lineGeoJson = (coords: readonly Position[]): Feature<LineString> => ({
  geometry: {
    // MapLibre wants [lon, lat]; the elevation triple is harmless but dropped
    // so the tile renderer isn't handed a dimension it ignores.
    coordinates: coords.map((coord) => [coord[0], coord[1]]),
    type: "LineString",
  },
  properties: {},
  type: "Feature",
});

const poiGeoJson = (pois: readonly Poi[]): FeatureCollection<Point> => ({
  features: pois.map((poi) => ({
    geometry: { coordinates: [poi.lon, poi.lat], type: "Point" },
    properties: { category: poi.category, name: poi.name ?? poi.category },
    type: "Feature",
  })),
  type: "FeatureCollection",
});

export function RouteMap({ bbox, coords, pois = [] }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const { resolvedTheme } = useTheme();

  // Create once. Re-creating on every data change would flicker and refetch
  // tiles, so updates go through setData below.
  useEffect(() => {
    if (container.current === null || map.current !== null) {
      return;
    }

    const instance = new MapLibreMap({
      container: container.current,
      style: STYLE_URL[resolvedTheme === "light" ? "light" : "dark"],
    });
    map.current = instance;

    instance.addControl(new NavigationControl(), "top-right");

    instance.on("load", () => {
      instance.addSource(LINE_SOURCE, {
        data: lineGeoJson(coords),
        type: "geojson",
      });
      instance.addLayer({
        id: LINE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#c8472b",
          "line-width": 4,
        },
        source: LINE_SOURCE,
        type: "line",
      });

      instance.addSource(POI_SOURCE, {
        data: poiGeoJson(pois),
        type: "geojson",
      });
      instance.addLayer({
        id: POI_SOURCE,
        paint: {
          "circle-color": "#f4ede1",
          "circle-radius": 5,
          "circle-stroke-color": "#0a0a0a",
          "circle-stroke-width": 2,
        },
        source: POI_SOURCE,
        type: "circle",
      });

      instance.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { duration: 0, padding: 48 }
      );
    });

    return () => {
      instance.remove();
      map.current = null;
    };
    // Deliberately create-once: data and theme are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push new geometry into the existing map.
  useEffect(() => {
    const instance = map.current;
    if (instance === null || !instance.isStyleLoaded()) {
      return;
    }

    const line = instance.getSource(LINE_SOURCE);
    if (line !== undefined && "setData" in line) {
      void (line as GeoJSONSource).setData(lineGeoJson(coords));
    }

    const poiSource = instance.getSource(POI_SOURCE);
    if (poiSource !== undefined && "setData" in poiSource) {
      void (poiSource as GeoJSONSource).setData(poiGeoJson(pois));
    }

    instance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 48 }
    );
  }, [bbox, coords, pois]);

  return (
    <div
      aria-label="Route map"
      className="h-[320px] w-full overflow-hidden rounded-md border border-[#1a1a1a] md:h-[440px]"
      ref={container}
      role="img"
    />
  );
}
