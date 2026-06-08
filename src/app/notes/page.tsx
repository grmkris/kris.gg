import Link from "next/link";

import { NOTES } from "@/content/notes";

export const metadata = {
  description: "Engineering patterns and technical writeups by Kristjan Grm.",
  title: "Notes",
};

export default function NotesIndex() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        <header className="mb-12">
          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            Notes
          </h1>
          <p className="mt-4 max-w-xl font-display text-lg italic leading-snug text-[#a3a3a3]">
            Reusable engineering patterns, pulled from real production
            codebases.
          </p>
        </header>

        <section>
          {NOTES.map((note) => (
            <Link
              className="group block border-t border-[#1a1a1a] py-6 transition-colors hover:border-[#333]"
              href={`/notes/${note.slug}`}
              key={note.slug}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-xl text-[#f4ede1] md:text-2xl">
                  {note.title}
                </h2>
                <span className="shrink-0 font-sans text-xs tabular-nums text-[#525252]">
                  {note.date}
                </span>
              </div>
              <p className="mt-2 font-display text-[0.975rem] italic leading-snug text-[#a3a3a3]">
                {note.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    className="rounded-full border border-[#262626] px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em] text-[#737373]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
