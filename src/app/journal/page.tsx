import Link from "next/link";

import { Manifest } from "@/components/manifest";
import { YearRuler } from "@/components/year-ruler";
import { TRIPS } from "@/content/trips";

export const metadata = {
  description:
    "Hackathons, trips, and a well-stamped passport — Kristjan Grm's journal.",
  title: "Journal",
};

export default function JournalIndex() {
  const years = [...new Set(TRIPS.map((t) => t.date.slice(0, 4)))];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        <div className="mb-12">
          <Link
            className="font-sans text-xs uppercase tracking-[0.15em] text-[#525252] transition-colors hover:text-[#f4ede1]"
            href="/"
          >
            ← Kristjan Grm
          </Link>
        </div>

        <header className="mb-12">
          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            Journal
          </h1>
          <p className="mt-4 max-w-xl font-display text-lg italic leading-snug text-[#a3a3a3]">
            Every hackathon, trip, and detour — interleaved by date. Hackathons
            keep the passport busy.
          </p>
        </header>

        {/* Manifest — every trip + hackathon, with the YearRuler scrubber. */}
        <div>
          <YearRuler years={years} />
          <Manifest trips={TRIPS} />
        </div>

        <footer className="mt-24 border-t border-[#1a1a1a] pt-8">
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-[#525252]">
            © {new Date().getFullYear()} · kris.gg
          </p>
        </footer>
      </div>
    </main>
  );
}
