import Link from "next/link";
import { notFound } from "next/navigation";
import { FLAGS } from "@/content/flags";
import { POSTS } from "@/content/journal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — Kristjan Grm`,
    description: post.summary,
  };
}

function renderBody(body: string) {
  return body.split("\n\n").map((para, i) => {
    const parts = para.split(/(\[[^\]]+\]\([^)]+\))/);
    return (
      <p
        key={`p-${i.toString()}`}
        className="mt-4 text-[#a3a3a3] leading-relaxed"
      >
        {parts.map((part, j) => {
          const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (match) {
            return (
              <a
                key={`a-${i.toString()}-${j.toString()}`}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e8e8e8] underline decoration-[#404040] underline-offset-2 transition-colors hover:decoration-[#737373]"
              >
                {match[1]}
              </a>
            );
          }
          return part;
        })}
      </p>
    );
  });
}

export default async function JournalPost({ params }: PageProps) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <article className="relative mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/journal"
            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
          >
            ← Journal
          </Link>
        </div>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[#525252]">
            <span>{post.date}</span>
            <span>·</span>
            <span>{FLAGS[post.location] ?? "🌍"}</span>
            <span>{post.location}</span>
          </div>
          <h1 className="mt-2 text-2xl font-medium">{post.title}</h1>
          <p className="mt-2 text-[#737373]">{post.summary}</p>
        </header>

        <div>{renderBody(post.body)}</div>

        {post.photos && post.photos.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {post.photos.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className="w-full rounded-sm border border-[#1a1a1a] object-cover"
              />
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
