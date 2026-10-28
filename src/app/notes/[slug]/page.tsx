import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public-footer";
import { getNote, NOTES } from "@/content/notes";
import { getProject } from "@/content/projects";
import { renderNoteBody } from "@/lib/notes";
import { siteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return NOTES.map((note) => ({ slug: note.slug }));
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
    <main className="public-page">
      <div className="public-container--narrow">
        <article className="public-note-article">
          <header className="public-note-header">
            <dl className="public-article-meta">
              <div>
                <dt>Published</dt>
                <dd>
                  <time dateTime={`${note.date}-01`}>{note.date}</time>
                </dd>
              </div>
              {source && (
                <div>
                  <dt>From</dt>
                  <dd>
                    <Link
                      className="public-link"
                      href={`/building/${source.slug}`}
                    >
                      {source.title}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <h1 className="public-title">{note.title}</h1>
            <p className="public-lead">{note.summary}</p>
            <ul
              aria-label="Topics"
              className="public-note-tags public-note-tags--header"
            >
              {note.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </header>
          <div className="public-note-content">{rendered}</div>
        </article>
      </div>
      <PublicFooter />
    </main>
  );
}
