/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAGS } from "@/content/flags";
import { TRIPS } from "@/content/trips";

const SOCIALS = [
  {
    href: "https://github.com/grmkris",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    label: "GitHub",
  },
  {
    href: "https://x.com/_krisgg",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    label: "X",
  },
  {
    href: "https://linkedin.com/in/kristjan-grm-1572a7159",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    label: "LinkedIn",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const years = [...new Set(TRIPS.map((t) => t.date.slice(0, 4)))];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className={`relative mx-auto max-w-2xl px-6 py-16 transition-all duration-700 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-lg font-medium">Kristjan Grm</h1>
          <p className="mt-1 text-sm text-[#737373]">Slovenia, Ljubljana 🇸🇮</p>
          <p className="mt-1 text-sm text-[#737373]">
            Now: Shanghai 🇨🇳 for{" "}
            <a
              href="https://mushanghai.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a3a3a3] transition-colors hover:text-[#e8e8e8]"
            >
              MU
            </a>
          </p>
          <p className="mt-1 text-sm text-[#737373]">
            Next: New York 🇺🇸 for ETHGlobal (Jun 7–14)
          </p>
          <p className="mt-4 text-[#a3a3a3] leading-relaxed">
            Hackathons keep the passport busy. Life outside the terminal: a
            cat, mountain trails, badminton, good techno, and whatever's
            cooking. Lately: AI agents, crypto identity, onchain payments.
          </p>

          {/* Social links with icons */}
          <div className="mt-6 flex gap-5">
            {SOCIALS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#525252] transition-colors hover:text-[#e8e8e8]"
                title={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </header>

        {/* Timeline (unified) */}
        <section>
          <h2 className="mb-8 text-sm font-medium uppercase tracking-wider text-[#737373]">
            Timeline
          </h2>

          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                <h3 className="mb-4 text-xs font-medium text-[#404040]">
                  {year}
                </h3>
                <div className="space-y-6">
                  {TRIPS.filter((t) => t.date.startsWith(year)).map((trip) => {
                    const hasDetail =
                      (trip.body && trip.body.length > 0) ||
                      (trip.photos && trip.photos.length > 0);
                    return (
                      <div
                        key={trip.slug}
                        className="border-l border-[#1a1a1a] pl-4 transition-colors hover:border-[#333]"
                      >
                        {/* Event/sub-header (flag + event name) */}
                        <div className="flex items-center gap-2 text-sm text-[#525252]">
                          <span>{FLAGS[trip.location] ?? "🌍"}</span>
                          <span>{trip.event ?? trip.location}</span>
                        </div>

                        {/* Title */}
                        <h4 className="mt-1 font-medium text-[#e8e8e8]">
                          {trip.title}
                        </h4>

                        {/* Project name (for combined entries where title is trip name) */}
                        {trip.project !== undefined &&
                          trip.title !== trip.project && (
                            <p className="mt-0.5 text-sm text-[#737373]">
                              {trip.project} — {trip.description}
                            </p>
                          )}
                        {(trip.project === undefined ||
                          trip.title === trip.project) && (
                          <p className="mt-0.5 text-sm text-[#737373]">
                            {trip.description}
                          </p>
                        )}

                        {/* Prizes */}
                        {trip.prizes !== undefined && (
                          <p className="mt-1 text-sm text-blue-400/80">
                            🏆 {trip.prizes}
                          </p>
                        )}

                        {/* Links */}
                        <div className="mt-2 flex gap-3">
                          {trip.github !== undefined && (
                            <a
                              href={trip.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                            >
                              GitHub →
                            </a>
                          )}
                          {trip.showcase !== undefined && (
                            <a
                              href={trip.showcase}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                            >
                              Showcase →
                            </a>
                          )}
                          {hasDetail && (
                            <Link
                              href={`/journal/${trip.slug}`}
                              className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                            >
                              Read more →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[#1a1a1a] pt-8">
          <p className="text-sm text-[#525252]">© {new Date().getFullYear()}</p>
        </footer>
      </div>
    </main>
  );
}
