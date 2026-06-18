import Image from "next/image";
import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photo-gallery";
import { FLAGS } from "@/content/flags";
import { TRIPS, type Trip } from "@/content/trips";
import { getCoverPhoto, getTripPhotos } from "@/lib/photos";
import { showcaseLabel } from "@/lib/prizes";

function renderBody(body: string) {
  return body.split("\n\n").map((para, i) => {
    const parts = para.split(/(\[[^\]]+\]\([^)]+\))/);
    return (
      <p
        key={`p-${i.toString()}`}
        className="mt-5 font-display text-[1.0625rem] leading-[1.7] text-[#c4bdb1]"
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
                className="text-[#f4ede1] underline decoration-[#525252] underline-offset-4 transition-colors hover:decoration-[#a3a3a3]"
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

function CreditBlock({ trip, prominent }: { trip: Trip; prominent: boolean }) {
  const hasLinks = trip.github !== undefined || trip.showcase !== undefined;

  return (
    <div
      className={
        prominent
          ? "mb-12 border-y border-[#262626] py-8"
          : "mb-10 border-y border-[#262626] py-5"
      }
    >
      {trip.event !== undefined && (
        <p
          className={
            prominent
              ? "credit-block text-sm text-[#a3a3a3]"
              : "credit-block text-xs text-[#a3a3a3]"
          }
        >
          {trip.event}
        </p>
      )}
      {(trip.project !== undefined || trip.prizes !== undefined) && (
        <p
          className={
            prominent
              ? "mt-3 font-display text-2xl font-light leading-tight text-[#f4ede1]"
              : "mt-1 font-sans text-sm text-[#e8e8e8]"
          }
        >
          {trip.project}
          {trip.project !== undefined && trip.prizes !== undefined && (
            <span className="mx-2 text-[#525252]">·</span>
          )}
          {trip.prizes !== undefined && (
            <span className="text-[#c8472b]">{trip.prizes}</span>
          )}
        </p>
      )}
      {hasLinks && (
        <div
          className={
            prominent
              ? "mt-5 flex gap-6 font-sans text-sm"
              : "mt-3 flex gap-4 font-sans text-xs"
          }
        >
          {trip.github !== undefined && (
            <a
              href={trip.github}
              target="_blank"
              rel="noopener noreferrer"
              className={
                prominent
                  ? "text-[#a3a3a3] transition-colors hover:text-[#f4ede1]"
                  : "text-[#737373] transition-colors hover:text-[#f4ede1]"
              }
            >
              GitHub →
            </a>
          )}
          {trip.showcase !== undefined && (
            <a
              href={trip.showcase}
              target="_blank"
              rel="noopener noreferrer"
              className={
                prominent
                  ? "text-[#a3a3a3] transition-colors hover:text-[#f4ede1]"
                  : "text-[#737373] transition-colors hover:text-[#f4ede1]"
              }
            >
              {showcaseLabel(trip.showcase)} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The trip article + photo masonry. Shared by the trip page (`/journal/<slug>`)
 * and the per-photo permalink (`/journal/<slug>/<id>`); the latter passes
 * `initialPhotoId` so the lightbox opens straight to that photo.
 */
export function TripView({
  slug,
  initialPhotoId,
}: {
  slug: string;
  initialPhotoId?: string;
}) {
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) {
    notFound();
  }

  const photos = getTripPhotos(slug);
  const cover = getCoverPhoto(slug);
  const hasHackathonMeta =
    trip.event !== undefined ||
    trip.project !== undefined ||
    trip.prizes !== undefined ||
    trip.github !== undefined ||
    trip.showcase !== undefined;
  const hasPhotos = photos.length > 0;
  const hasBody = trip.body !== undefined && trip.body.length > 0;
  const textOnly = !hasBody && !hasPhotos;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Full-bleed hero photo (only when a cover exists) */}
      {cover && (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden bg-[#1a1a1a] md:h-[65vh]">
          <Image
            src={cover.full}
            alt=""
            fill
            priority
            placeholder="blur"
            blurDataURL={cover.blur}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        </div>
      )}

      <article
        className={
          cover
            ? "relative mx-auto max-w-2xl px-6 pt-12 pb-16"
            : "relative mx-auto max-w-2xl px-6 pt-20 pb-16"
        }
      >
        <header className="mb-10">
          <div className="flex items-center gap-2 font-sans text-sm tabular-nums text-[#737373]">
            <span>{trip.date}</span>
            <span>·</span>
            <span>{FLAGS[trip.location] ?? "🌍"}</span>
            <span>{trip.location}</span>
          </div>
          <h1 className="mt-3 font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            {trip.title}
          </h1>
          <p className="mt-4 font-display text-lg italic leading-snug text-[#a3a3a3]">
            {trip.description}
          </p>
        </header>

        {hasHackathonMeta && <CreditBlock prominent={textOnly} trip={trip} />}

        {hasBody && <div>{renderBody(trip.body as string)}</div>}
      </article>

      {/* Photo masonry — wider than the article column */}
      {hasPhotos && (
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <PhotoGallery
            basePath={`/journal/${slug}`}
            initialPhotoId={initialPhotoId}
            photos={photos}
          />
        </section>
      )}
    </main>
  );
}
