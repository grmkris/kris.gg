"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  type Activity,
  appleMapsUrl,
  googleMapsUrl,
} from "@/lib/route/export-urls";
import { gpxFilename, toGpx } from "@/lib/route/gpx";
import { formatDistance, formatDuration } from "@/lib/route/pace";
import { getApi, runApi } from "@/lib/api/runtime";
import type { PlannedRoute } from "@/planner/schema";

const RouteMap = dynamic(
  () => import("../../route-map").then((module) => module.RouteMap),
  {
    loading: () => (
      <div className="h-[320px] w-full animate-pulse rounded-md border border-[#1a1a1a] bg-[#111] md:h-[440px]" />
    ),
    ssr: false,
  }
);

const BUTTON =
  "min-h-[44px] rounded-md border border-[#333] px-4 text-sm text-[#e8e8e8] transition-colors hover:border-[#555]";

/**
 * Read-only view of a shared route. Deliberately has no sign-in gate: the
 * `shareId` in the URL *is* the credential, and the endpoint behind this is the
 * one un-middlewared group in the API.
 */
export function SharedView({ shareId }: { shareId: string }) {
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const api = await getApi();
        setRoute(await runApi(api.routesPublic.shared({ params: { shareId } })));
      } catch {
        // A wrong or revoked id is indistinguishable from "never existed", by
        // design — it should not confirm that an id was once valid.
        setError("This route link is not available.");
      }
    };
    void load();
  }, [shareId]);

  if (error !== null) {
    return <p className="text-[#525252] text-sm">{error}</p>;
  }
  if (route === null) {
    return <p className="text-[#525252] text-sm">Loading…</p>;
  }

  const activity = route.activity as Activity;

  const downloadGpx = () => {
    const url = URL.createObjectURL(
      new Blob([toGpx({ coords: route.coords, name: route.title })], {
        type: "application/gpx+xml",
      })
    );
    const anchor = document.createElement("a");
    anchor.download = gpxFilename(route.title);
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display font-light text-3xl text-[#f4ede1] md:text-4xl">
          {route.title}
        </h1>
        <p className="mt-1 font-sans text-[#525252] text-xs uppercase tracking-wide">
          {activity} · shared from kris.gg
        </p>
      </header>

      <RouteMap bbox={route.bbox} coords={route.coords} pois={route.pois} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="font-sans text-[#525252] text-xs uppercase tracking-wide">
            Distance
          </div>
          <div className="text-[#f4ede1] text-lg tabular-nums">
            {formatDistance(route.stats.distanceM)}
          </div>
        </div>
        <div>
          <div className="font-sans text-[#525252] text-xs uppercase tracking-wide">
            Time
          </div>
          <div className="text-[#f4ede1] text-lg tabular-nums">
            {formatDuration(route.stats.durationS)}
          </div>
        </div>
        <div>
          <div className="font-sans text-[#525252] text-xs uppercase tracking-wide">
            Ascent
          </div>
          <div className="text-[#f4ede1] text-lg tabular-nums">
            {Math.round(route.stats.ascentM)} m
          </div>
        </div>
      </div>

      {route.why.length === 0 ? null : (
        <ul className="space-y-1.5 border-[#1a1a1a] border-t pt-4">
          {route.why.map((line) => (
            <li className="text-[#a3a3a3] text-sm" key={line}>
              — {line}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-[#1a1a1a] border-t pt-4">
        <a
          className={`${BUTTON} inline-flex items-center`}
          href={googleMapsUrl({ activity, coords: route.coords })}
          rel="noreferrer"
          target="_blank"
        >
          Google Maps
        </a>
        <a
          className={`${BUTTON} inline-flex items-center`}
          href={appleMapsUrl({ activity, coords: route.coords })}
          rel="noreferrer"
          target="_blank"
        >
          Apple Maps
        </a>
        <button className={BUTTON} onClick={downloadGpx} type="button">
          GPX
        </button>
      </div>
    </div>
  );
}
