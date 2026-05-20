import Image from "next/image";
import { HeroRotating } from "@/components/hero-rotating";
import { Manifest } from "@/components/manifest";
import { YearRuler } from "@/components/year-ruler";
import { PORTRAIT } from "@/content/portrait.generated";
import { TRIPS } from "@/content/trips";
import { getHeroCovers } from "@/lib/covers";

const SOCIALS = [
  {
    href: "https://github.com/grmkris",
    label: "GitHub",
  },
  {
    href: "https://x.com/_krisgg",
    label: "X",
  },
  {
    href: "https://linkedin.com/in/kristjan-grm-1572a7159",
    label: "LinkedIn",
  },
];

export default function Home() {
  const years = Array.from(new Set(TRIPS.map((t) => t.date.slice(0, 4))));

  // Curated hero pool — selected by Opus 4.7 subagents (scouts + judge)
  const covers = getHeroCovers();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-24 md:px-12 md:pt-20">
        {/* Hero block */}
        <header className="mb-20 grid gap-10 md:mb-32 md:grid-cols-[1.2fr_1fr] md:gap-16">
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-6 h-[72px] w-[72px] overflow-hidden rounded-full ring-1 ring-[#262626] md:h-[96px] md:w-[96px]">
                <Image
                  src={PORTRAIT.webp400}
                  alt="Kristjan Grm"
                  width={96}
                  height={96}
                  priority
                  placeholder="blur"
                  blurDataURL={PORTRAIT.blur}
                  className="h-full w-full object-cover"
                />
              </div>
              <h1 className="font-display text-[clamp(3.5rem,9vw,7rem)] font-light leading-[0.95] tracking-[-0.02em] text-[#f4ede1]">
                Kristjan
                <br />
                Grm
              </h1>

              <div className="mt-8 space-y-1 font-sans text-sm text-[#737373] tabular-nums">
                <p>Slovenia 🇸🇮 · Ljubljana</p>
                <p>
                  Now: Shanghai 🇨🇳 for{" "}
                  <a
                    href="https://mushanghai.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#a3a3a3] underline decoration-[#404040] underline-offset-2 transition-colors hover:text-[#f4ede1] hover:decoration-[#a3a3a3]"
                  >
                    MU
                  </a>
                </p>
                <p>Next: New York 🇺🇸 · ETHGlobal Jun 7–14</p>
              </div>

              <p className="mt-8 max-w-md font-display text-lg italic leading-snug text-[#c4bdb1]">
                Hackathons keep the passport busy. Life outside the terminal:
                a cat, mountain trails, badminton, good techno, and whatever's
                cooking. Lately: AI agents, crypto identity, onchain payments.
              </p>
            </div>

            <div className="mt-10 flex gap-5 font-sans text-xs uppercase tracking-[0.15em]">
              {SOCIALS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#525252] transition-colors hover:text-[#f4ede1]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Hero photo (right column on desktop, below on mobile) */}
          <div className="md:pl-4">
            <HeroRotating covers={covers} />
          </div>
        </header>

        {/* Manifest — every trip + hackathon, interleaved by date.
            Wrap with YearRuler so the mobile sticky strip pins to the top
            of the manifest section (not over the hero). */}
        <div>
          <YearRuler years={years} />
          <Manifest trips={TRIPS} />
        </div>

        {/* Footer */}
        <footer className="mt-24 border-t border-[#1a1a1a] pt-8">
          <p className="font-sans text-xs uppercase tracking-[0.15em] text-[#525252]">
            © {new Date().getFullYear()} · kris.gg
          </p>
        </footer>
      </div>
    </main>
  );
}
