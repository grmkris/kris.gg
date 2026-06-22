import Image from "next/image";
import Link from "next/link";

import { Contact } from "@/components/contact";
import { HeroRotating } from "@/components/hero-rotating";
import { NOTES } from "@/content/notes";
import { PROJECTS } from "@/content/projects";
import { TRIPS } from "@/content/trips";
import { getHeroFrames } from "@/lib/covers";
import { getCoverPhoto, type PhotoMeta } from "@/lib/photos";

// Literal route union — each member is a real route, so Link accepts it
// without a cast (a widened `string` would not be assignable).
type SectionHref = "/building" | "/journal" | "/notes";

const SECTIONS: {
  coverSlug: string;
  desc: string;
  href: SectionHref;
  label: string;
  meta: string;
}[] = [
  {
    coverSlug: PROJECTS[0]?.slug ?? "",
    desc: "Production AI, full-stack & web3 products — idea to live, fast.",
    href: "/building",
    label: "Building",
    meta: `${PROJECTS.length} projects`,
  },
  {
    // TRIPS[0] is the newest entry (may lack photos) — pin a photo-rich trip
    // so the index hover reveal always has an image.
    coverSlug: "shanghai-mu-2026",
    desc: "Hackathons, trips, and a well-stamped passport.",
    href: "/journal",
    label: "Journal",
    meta: `${TRIPS.length} entries`,
  },
  {
    coverSlug: NOTES[0]?.sourceProject ?? PROJECTS[0]?.slug ?? "",
    desc: "Engineering patterns and field notes.",
    href: "/notes",
    label: "Notes",
    meta: `${NOTES.length} notes`,
  },
];

function IndexRow({
  cover,
  desc,
  href,
  label,
  meta,
}: {
  cover: PhotoMeta | null;
  desc: string;
  href: SectionHref;
  label: string;
  meta: string;
}) {
  return (
    <Link
      className="group relative block border-t border-[#1a1a1a] py-6 transition-colors hover:border-[#333]"
      href={href}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl text-[#f4ede1] transition-colors group-hover:text-[#c8472b] md:text-3xl">
          {label}
        </h2>
        <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.15em] text-[#525252]">
          {meta}
        </span>
      </div>
      <p className="mt-2 max-w-xl font-display text-[1.0625rem] italic leading-snug text-[#a3a3a3]">
        {desc}
      </p>

      {cover ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[-13rem] hidden h-28 w-44 -translate-y-1/2 overflow-hidden rounded-sm opacity-0 transition-opacity duration-500 ease-[var(--ease-out-strong)] group-hover:opacity-100 xl:block"
        >
          <Image
            alt=""
            blurDataURL={cover.blur}
            className="object-cover"
            fill
            placeholder="blur"
            sizes="176px"
            src={cover.mid}
          />
        </div>
      ) : null}
    </Link>
  );
}

export default function Home() {
  // Curated hero pool (photo + slug + caption) — selected by Opus 4.7 subagents.
  const frames = getHeroFrames();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-16 md:px-12 md:pt-20">
        {/* Hero — who I am + how to reach me. Mobile order: name → photo →
            meta; desktop: name + meta stacked left, photo right (see .hero-grid). */}
        <header className="hero-grid">
          {/* Reveal stagger: even ~70ms gaps — name → photo → meta cascade */}
          <div className="hero-name reveal" style={{ animationDelay: "0ms" }}>
            <h1 className="font-display text-[clamp(3.5rem,9vw,7rem)] font-light leading-[0.95] tracking-[-0.02em] text-[#f4ede1]">
              Kristjan
              <br />
              Grm
            </h1>
          </div>

          {/* Rolling images — links each frame to its journal entry */}
          <div
            className="hero-photo reveal md:pl-4"
            style={{ animationDelay: "70ms" }}
          >
            <HeroRotating frames={frames} />
          </div>

          <div className="hero-meta flex flex-col gap-8">
            <div
              className="reveal space-y-1 font-sans text-sm text-[#737373] tabular-nums"
              style={{ animationDelay: "140ms" }}
            >
              <p>Slovenia 🇸🇮 · Ljubljana</p>
            </div>

            <p
              className="reveal max-w-md font-display text-lg italic leading-snug text-[#c4bdb1]"
              style={{ animationDelay: "210ms" }}
            >
              Builder at the AI × crypto × privacy intersection. Hackathons keep
              the passport busy; life outside the terminal is a cat, mountain
              trails, badminton, and good techno.
            </p>
          </div>
        </header>

        {/* Index — the four places to go next */}
        <section className="mt-20 md:mt-28">
          <p className="credit-block mb-3 text-xs text-[#525252]">Index</p>
          <div>
            {SECTIONS.map((section) => (
              <IndexRow
                cover={getCoverPhoto(section.coverSlug)}
                desc={section.desc}
                href={section.href}
                key={section.href}
                label={section.label}
                meta={section.meta}
              />
            ))}
          </div>
        </section>

        {/* Contact + copyright — moved out of the hero to the page foot */}
        <footer className="mt-24">
          <Contact />
          <p className="mt-8 font-sans text-xs uppercase tracking-[0.15em] text-[#525252]">
            © {new Date().getFullYear()} · kris.gg
          </p>
        </footer>
      </div>
    </main>
  );
}
