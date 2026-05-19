import Link from "next/link";
import { notFound } from "next/navigation";
import { FLAGS } from "@/content/flags";
import { TRIPS } from "@/content/trips";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TRIPS.filter(
    (t) => (t.body && t.body.length > 0) || (t.photos && t.photos.length > 0)
  ).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) return {};
  return {
    title: `${trip.title} — Kristjan Grm`,
    description: trip.description,
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
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) notFound();

  const hasHackathonMeta =
    trip.event !== undefined ||
    trip.project !== undefined ||
    trip.prizes !== undefined ||
    trip.github !== undefined ||
    trip.showcase !== undefined;

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
            href="/"
            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
          >
            ← Back
          </Link>
        </div>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[#525252]">
            <span>{trip.date}</span>
            <span>·</span>
            <span>{FLAGS[trip.location] ?? "🌍"}</span>
            <span>{trip.location}</span>
          </div>
          <h1 className="mt-2 font-display text-4xl font-light tracking-tight">
            {trip.title}
          </h1>
          <p className="mt-2 text-[#737373]">{trip.description}</p>
        </header>

        {/* Hackathon metadata block */}
        {hasHackathonMeta && (
          <div className="mb-8 border-l border-[#1a1a1a] pl-4">
            {trip.event !== undefined && (
              <p className="text-sm text-[#525252]">{trip.event}</p>
            )}
            {trip.project !== undefined && (
              <p className="mt-1 font-medium text-[#e8e8e8]">{trip.project}</p>
            )}
            {trip.prizes !== undefined && (
              <p className="mt-1 text-sm text-blue-400/80">🏆 {trip.prizes}</p>
            )}
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
            </div>
          </div>
        )}

        {trip.body && <div>{renderBody(trip.body)}</div>}

        {trip.photos && trip.photos.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {trip.photos.map((src) => (
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
