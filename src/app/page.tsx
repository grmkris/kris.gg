import Image from "next/image";
import Link from "next/link";

import { Contact } from "@/components/contact";
import { HeroRotating } from "@/components/hero-rotating";
import { NOTES } from "@/content/notes";
import { PROJECTS } from "@/content/projects";
import { TRIPS } from "@/content/trips";
import { getHeroCovers } from "@/lib/covers";
import { getCoverPhoto, type PhotoMeta } from "@/lib/photos";

// Literal route union — each member is a real route, so Link accepts it
// without a cast (a widened `string` would not be assignable).
type SectionHref = "/building" | "/journal" | "/notes" | "/now";

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
    coverSlug: TRIPS[0]?.slug ?? "",
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
  {
    coverSlug: "sonara",
    desc: "What I'm building right this month.",
    href: "/now",
    label: "Now",
    meta: "Live",
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
          className="pointer-events-none absolute top-1/2 right-[-13rem] hidden h-28 w-44 -translate-y-1/2 overflow-hidden rounded-sm opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 xl:block"
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
  // Curated hero pool — selected by Opus 4.7 subagents (scouts + judge).
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

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pt-12 pb-16 md:px-12 md:pt-16">
        {/* Hero — who I am + how to reach me */}
        <header className="grid flex-1 content-center gap-10 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-16">
          <div className="flex flex-col gap-8">
            <div className="reveal" style={{ animationDelay: "0ms" }}>
              <h1 className="font-display text-[clamp(3.5rem,9vw,7rem)] font-light leading-[0.95] tracking-[-0.02em] text-[#f4ede1]">
                Kristjan
                <br />
                Grm
              </h1>
            </div>

            <div
              className="reveal space-y-1 font-sans text-sm text-[#737373] tabular-nums"
              style={{ animationDelay: "90ms" }}
            >
              <p>Slovenia 🇸🇮 · Ljubljana</p>
              <p>
                Now: New York 🇺🇸 ·{" "}
                <a
                  className="text-[#a3a3a3] underline decoration-[#404040] underline-offset-2 transition-colors hover:text-[#f4ede1] hover:decoration-[#a3a3a3]"
                  href="https://ethconf.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  ETHConf
                </a>{" "}
                + ETHGlobal · Jun 7–14
              </p>
            </div>

            <p
              className="reveal max-w-md font-display text-lg italic leading-snug text-[#c4bdb1]"
              style={{ animationDelay: "180ms" }}
            >
              Builder at the AI × crypto × privacy intersection. Hackathons keep
              the passport busy; life outside the terminal is a cat, mountain
              trails, badminton, and good techno.
            </p>

            <div className="reveal" style={{ animationDelay: "270ms" }}>
              <Contact />
            </div>
          </div>

          {/* Rolling images (right column on desktop, below on mobile) */}
          <div className="reveal md:pl-4" style={{ animationDelay: "150ms" }}>
            <HeroRotating covers={covers} />
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
