import Link from "next/link";
import { notFound } from "next/navigation";

import { getNote, NOTES } from "@/content/notes";
import { getProject } from "@/content/projects";
import { renderNoteBody } from "@/lib/notes";
import { siteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return NOTES.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) {
    return {};
  }
  return {
    description: note.summary,
    openGraph: {
      description: note.summary,
      publishedTime: `${note.date}-01`,
      siteName: "kris.gg",
      title: note.title,
      type: "article" as const,
      url: `${siteUrl()}/notes/${slug}`,
    },
    title: note.title,
    twitter: {
      card: "summary_large_image" as const,
      creator: "@_krisgg",
      description: note.summary,
      title: note.title,
    },
  };
}

export default async function NotePage({ params }: PageProps) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) {
    notFound();
  }

  const rendered = await renderNoteBody(note.body);
  const source = note.sourceProject
    ? getProject(note.sourceProject)
    : undefined;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <article className="relative mx-auto max-w-2xl px-6 pt-16 pb-24 md:pt-24">
        <header className="mb-10">
          <div className="flex items-center gap-2 font-sans text-sm tabular-nums text-[#737373]">
            <span>{note.date}</span>
            {source ? (
              <>
                <span>·</span>
                <span>
                  from{" "}
                  <Link
                    className="text-[#a3a3a3] underline decoration-[#404040] underline-offset-2 transition-colors hover:text-[#f4ede1]"
                    href={`/building/${source.slug}`}
                  >
                    {source.title}
                  </Link>
                </span>
              </>
            ) : null}
          </div>
          <h1 className="mt-3 font-display text-4xl font-light leading-[1.08] tracking-tight text-[#f4ede1] md:text-5xl">
            {note.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                className="rounded-full border border-[#262626] px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em] text-[#737373]"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div>{rendered}</div>
      </article>
    </main>
  );
}
