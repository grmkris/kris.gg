"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  type Activity,
  appleMapsUrl,
  googleMapsUrl,
} from "@/lib/route/export-urls";
import type { Coord } from "@/lib/route/geo";
import { gpxFilename, toGpx } from "@/lib/route/gpx";
import { formatDistance, formatDuration } from "@/lib/route/pace";
import { authClient, useSession } from "@/lib/auth-client";
import type { GeneratedRoute, Mood, RouteInputs } from "@/planner/schema";
import { planRoute } from "./planner-client";

// MapLibre needs `window` and WebGL2 at module scope — it can only be loaded
// on the client, and eager import would break the build rather than the render.
const RouteMap = dynamic(
  () => import("./route-map").then((module) => module.RouteMap),
  {
    loading: () => (
      <div className="h-[320px] w-full animate-pulse rounded-md border border-[#1a1a1a] bg-[#111] md:h-[440px]" />
    ),
    ssr: false,
  }
);

const ACTIVITIES: readonly { label: string; value: Activity }[] = [
  { label: "Run", value: "run" },
  { label: "Walk", value: "walk" },
  { label: "Bike", value: "bike" },
  { label: "Hike", value: "hike" },
];

const MOODS: readonly Mood[] = [
  "scenic",
  "quiet",
  "tourist",
  "fast",
  "nature",
];

/** Fallback start when geolocation is unavailable or refused. */
const DEFAULT_START = { lat: 46.0511, lon: 14.5051 };

const BUTTON =
  "min-h-[44px] rounded-md border px-4 text-sm transition-colors disabled:opacity-50";
const IDLE = "border-[#333] text-[#e8e8e8] hover:border-[#555]";
const ACTIVE = "border-[#c8472b] bg-[#c8472b]/10 text-[#f4ede1]";

function SignIn() {
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const result = await authClient.signIn.passkey();
    setBusy(false);
    if (result?.error) {
      toast.error(result.error.message ?? "Passkey sign-in failed");
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-display font-light text-4xl text-[#f4ede1]">
        Routes
      </h1>
      <button
        className={`${BUTTON} ${IDLE}`}
        disabled={busy}
        onClick={signIn}
        type="button"
      >
        {busy ? "Waiting for passkey…" : "Sign in with passkey"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-sans text-[#525252] text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="text-[#f4ede1] text-lg tabular-nums">{value}</div>
    </div>
  );
}

export function PlannerView() {
  const { data: session, isPending } = useSession();
  const signedIn = session?.user !== undefined;

  const [activity, setActivity] = useState<Activity>("run");
  const [distanceKm, setDistanceKm] = useState(5);
  const [mood, setMood] = useState<Mood>("scenic");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(DEFAULT_START);
  const [located, setLocated] = useState(false);

  const [route, setRoute] = useState<GeneratedRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedBase, setSeedBase] = useState(1);

  // Ask once, and treat refusal as "use the default" rather than an error —
  // a denied permission prompt should not look like a broken app.
  useEffect(() => {
    if (!signedIn || located || typeof navigator === "undefined") {
      return;
    }
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setStart({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocated(true);
      },
      () => setLocated(true),
      { timeout: 8000 }
    );
  }, [signedIn, located]);

  const generate = useCallback(
    async (overrides: Partial<RouteInputs> = {}, nextSeed?: number) => {
      const inputs: RouteInputs = {
        activity,
        distanceKm,
        mood,
        start,
        ...(notes.trim() === "" ? {} : { notes: notes.trim() }),
        ...overrides,
      };

      setBusy(true);
      try {
        const generated = await planRoute(inputs, nextSeed ?? seedBase);
        setRoute(generated);
        // Keep the form in sync when a chip changed the inputs.
        if (overrides.distanceKm !== undefined) {
          setDistanceKm(overrides.distanceKm);
        }
        if (overrides.mood !== undefined) {
          setMood(overrides.mood);
        }
      } catch (error) {
        toast.error(`Could not generate a route: ${String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [activity, distanceKm, mood, notes, seedBase, start]
  );

  const reroll = useCallback(() => {
    const next = seedBase + 1000;
    setSeedBase(next);
    void generate({}, next);
  }, [generate, seedBase]);

  const downloadGpx = useCallback(() => {
    if (route === null) {
      return;
    }
    const gpx = toGpx({ coords: route.chosen.coords, name: route.title });
    const url = URL.createObjectURL(
      new Blob([gpx], { type: "application/gpx+xml" })
    );
    const anchor = document.createElement("a");
    anchor.download = gpxFilename(route.title);
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [route]);

  if (isPending) {
    return <p className="text-[#525252] text-sm">Loading…</p>;
  }
  if (!signedIn) {
    return <SignIn />;
  }

  const coords: readonly Coord[] = route?.chosen.coords ?? [];

  return (
    <>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display font-light text-4xl text-[#f4ede1] tracking-tight md:text-5xl">
          Routes
        </h1>
        <span className="shrink-0 font-sans text-[#525252] text-xs">
          {located ? "using your location" : "locating…"}
        </span>
      </header>

      <section className="space-y-5">
        <fieldset>
          <legend className="mb-2 font-sans text-[#525252] text-xs uppercase tracking-wide">
            Activity
          </legend>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((option) => (
              <button
                className={`${BUTTON} ${activity === option.value ? ACTIVE : IDLE}`}
                key={option.value}
                onClick={() => setActivity(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            className="mb-2 block font-sans text-[#525252] text-xs uppercase tracking-wide"
            htmlFor="distance"
          >
            Distance — {distanceKm} km
          </label>
          <input
            className="h-11 w-full accent-[#c8472b]"
            id="distance"
            max={30}
            min={1}
            onChange={(event) => setDistanceKm(Number(event.target.value))}
            step={0.5}
            type="range"
            value={distanceKm}
          />
        </div>

        <fieldset>
          <legend className="mb-2 font-sans text-[#525252] text-xs uppercase tracking-wide">
            Vibe
          </legend>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((option) => (
              <button
                className={`${BUTTON} ${mood === option ? ACTIVE : IDLE}`}
                key={option}
                onClick={() => setMood(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <textarea
          className="min-h-[72px] w-full resize-y rounded-md border border-[#1a1a1a] bg-[#111] p-3 text-[#e8e8e8] text-sm outline-none transition-colors placeholder:text-[#525252] focus:border-[#333]"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything else? e.g. coffee halfway, avoid stairs, lots of shade"
          value={notes}
        />

        <button
          className={`${BUTTON} w-full border-[#c8472b] bg-[#c8472b] font-medium text-[#0a0a0a] hover:bg-[#b03e25]`}
          disabled={busy}
          onClick={() => void generate()}
          type="button"
        >
          {busy ? "Generating…" : "Generate route"}
        </button>
      </section>

      {route === null ? null : (
        <section className="mt-10 space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display font-light text-2xl text-[#f4ede1]">
              {route.title}
            </h2>
            <button
              aria-label="Generate a different route"
              className={`${BUTTON} ${IDLE} shrink-0 px-3`}
              disabled={busy}
              onClick={reroll}
              type="button"
            >
              🎲
            </button>
          </div>

          <RouteMap
            bbox={route.chosen.bbox}
            coords={route.chosen.coords}
            pois={route.pois}
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Distance"
              value={formatDistance(route.chosen.stats.distanceM)}
            />
            <Stat
              label="Time"
              value={formatDuration(route.chosen.stats.durationS)}
            />
            <Stat
              label="Ascent"
              value={`${Math.round(route.chosen.stats.ascentM)} m`}
            />
            <Stat label="Points" value={String(route.pois.length)} />
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

          <div>
            <div className="mb-2 font-sans text-[#525252] text-xs uppercase tracking-wide">
              Refine
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`${BUTTON} ${IDLE}`}
                disabled={busy}
                onClick={() =>
                  void generate({
                    distanceKm: Math.max(1, Math.round(distanceKm * 0.8 * 2) / 2),
                  })
                }
                type="button"
              >
                Shorter
              </button>
              <button
                className={`${BUTTON} ${IDLE}`}
                disabled={busy}
                onClick={() =>
                  void generate({
                    distanceKm: Math.min(
                      30,
                      Math.round(distanceKm * 1.25 * 2) / 2
                    ),
                  })
                }
                type="button"
              >
                Longer
              </button>
              <button
                className={`${BUTTON} ${IDLE}`}
                disabled={busy}
                onClick={() =>
                  void generate({
                    notes: `${notes} flatter, avoid hills`.trim(),
                  })
                }
                type="button"
              >
                Flatter
              </button>
              <button
                className={`${BUTTON} ${IDLE}`}
                disabled={busy}
                onClick={() => void generate({ mood: "nature" })}
                type="button"
              >
                More nature
              </button>
              <button
                className={`${BUTTON} ${IDLE}`}
                disabled={busy}
                onClick={() => void generate({ mood: "quiet" })}
                type="button"
              >
                Quieter
              </button>
            </div>
          </div>

          <div className="border-[#1a1a1a] border-t pt-4">
            <div className="mb-2 font-sans text-[#525252] text-xs uppercase tracking-wide">
              Open in
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className={`${BUTTON} ${IDLE} inline-flex items-center`}
                href={googleMapsUrl({ activity, coords })}
                rel="noreferrer"
                target="_blank"
              >
                Google Maps
              </a>
              <a
                className={`${BUTTON} ${IDLE} inline-flex items-center`}
                href={appleMapsUrl({
                  activity,
                  avoidStairs: true,
                  coords,
                })}
                rel="noreferrer"
                target="_blank"
              >
                Apple Maps
              </a>
              <button
                className={`${BUTTON} ${IDLE}`}
                onClick={downloadGpx}
                type="button"
              >
                GPX
              </button>
            </div>
            <p className="mt-2 text-[#525252] text-xs">
              Map links carry only a few waypoints, so they approximate the
              route. GPX is the exact one.
            </p>
          </div>
        </section>
      )}

      {/* Mounted here, not in the root layout: only the private tools raise
          toasts, so the public pages keep shipping no extra JS. */}
      <Toaster />
    </>
  );
}
