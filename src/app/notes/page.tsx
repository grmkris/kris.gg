import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";
import { NOTES } from "@/content/notes";

export const metadata = {
  description: "Engineering patterns and technical writeups by Kristjan Grm.",
  title: "Notes",
};

export default function NotesIndex() {
  return (
    <main className="public-page">
      <div className="public-container public-notes-page">
        <header className="public-notes-header">
          <h1 className="public-title">Notes</h1>
          <p className="public-lead">
            Reusable engineering patterns, pulled from real production
            codebases.
          </p>
        </header>

        <section aria-label="Engineering notes" className="public-notes-index">
          {NOTES.map((note) => (
            <Link
              className="public-note-row"
              href={`/notes/${note.slug}`}
              key={note.slug}
            >
              <time className="public-note-date" dateTime={`${note.date}-01`}>
                {note.date}
              </time>
              <div className="public-note-summary">
                <h2>{note.title}</h2>
                <p>{note.summary}</p>
                <ul aria-label="Topics" className="public-note-tags">
                  {note.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </section>
      </div>
      <PublicFooter />
    </main>
  );
}
