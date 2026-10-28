import Image from "next/image";
import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photo-gallery";
import { PublicFooter } from "@/components/public-footer";
import { TRIPS } from "@/content/trips";
import type { Trip } from "@/content/trips";
import { getCoverPhoto, getTripPhotos } from "@/lib/photos";
import { showcaseLabel } from "@/lib/prizes";

function renderBody(body: string) {
  return body.split("\n\n").map((paragraph, index) => {
    const parts = paragraph.split(/(\[[^\]]+\]\([^)]+\))/);
    return (
      <p key={`p-${index.toString()}`}>
        {parts.map((part, partIndex) => {
          const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
          if (match) {
            return (
              <a
                className="public-link"
                href={match[2]}
                key={`a-${index.toString()}-${partIndex.toString()}`}
                rel="noopener noreferrer"
                target="_blank"
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

function CreditBlock({ trip }: { trip: Trip }) {
  const hasLinks = trip.github !== undefined || trip.showcase !== undefined;

  return (
    <aside className="public-credit">
      <dl>
        {trip.event !== undefined && (
          <div>
            <dt>Event</dt>
            <dd>{trip.event}</dd>
          </div>
        )}
        {trip.project !== undefined && (
          <div>
            <dt>Project</dt>
            <dd>{trip.project}</dd>
          </div>
        )}
        {trip.prizes !== undefined && (
          <div>
            <dt>Result</dt>
            <dd>{trip.prizes}</dd>
          </div>
        )}
      </dl>
      {hasLinks && (
        <div className="public-credit-links">
          {trip.github !== undefined && (
            <a
              className="public-link"
              href={trip.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          )}
          {trip.showcase !== undefined && (
            <a
              className="public-link"
              href={trip.showcase}
              rel="noopener noreferrer"
              target="_blank"
            >
              {showcaseLabel(trip.showcase)}
            </a>
          )}
        </div>
      )}
    </aside>
  );
}

/** Shared by the trip article and its existing per-photo permalink. */
export function TripView({
  slug,
  initialPhotoId,
}: {
  slug: string;
  initialPhotoId?: string;
}) {
  const trip = TRIPS.find((entry) => entry.slug === slug);
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
  const hasBody = trip.body !== undefined && trip.body.length > 0;

  return (
    <main className="public-page">
      <div className="public-container">
        <article className="public-trip-article">
          <header className="public-trip-header">
            <div>
              <h1 className="public-title">{trip.title}</h1>
              <p className="public-lead">{trip.description}</p>
            </div>
            <dl className="public-article-meta">
              <div>
                <dt>When</dt>
                <dd>
                  <time dateTime={`${trip.date}-01`}>{trip.date}</time>
                </dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{trip.location}</dd>
              </div>
            </dl>
          </header>

          {cover && (
            <figure className="public-trip-cover">
              <Image
                alt=""
                blurDataURL={cover.blur}
                height={cover.height}
                placeholder="blur"
                priority
                sizes="(min-width: 1400px) 1312px, 95vw"
                src={cover.full}
                width={cover.width}
              />
            </figure>
          )}

          {(hasBody || hasHackathonMeta) && (
            <div className="public-trip-content">
              <div className="public-prose">
                {hasBody && renderBody(trip.body as string)}
              </div>
              {hasHackathonMeta && <CreditBlock trip={trip} />}
            </div>
          )}
        </article>

        {photos.length > 0 && (
          <section
            aria-label={`${trip.title} photographs`}
            className="public-gallery"
          >
            <PhotoGallery
              basePath={`/journal/${slug}`}
              initialPhotoId={initialPhotoId}
              photos={photos}
            />
          </section>
        )}
      </div>
      <PublicFooter />
    </main>
  );
}
