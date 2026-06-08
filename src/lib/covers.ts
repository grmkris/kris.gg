import coversData from "@/content/covers.generated.json";
import { TRIPS } from "@/content/trips";
import { getTripPhotos, type PhotoMeta } from "@/lib/photos";

interface CoverEntry {
  slug: string;
  index: number;
}

export interface HeroFrame {
  photo: PhotoMeta;
  /** Trip slug the photo belongs to — links the hero frame to /journal/[slug]. */
  slug: string;
  /** Caption shown over the frame, e.g. "Shanghai · 2026". */
  label: string;
}

const entries = coversData.covers as CoverEntry[];

/**
 * Curated hero pool: 16 hand-picked photos selected by parallel Opus 4.7
 * scouts + a final judge pass. Used by HeroRotating on the home page.
 */
export function getHeroCovers(): PhotoMeta[] {
  const out: PhotoMeta[] = [];
  for (const entry of entries) {
    const photos = getTripPhotos(entry.slug);
    const photo = photos[entry.index - 1];
    if (photo) {
      out.push(photo);
    }
  }
  return out;
}

/**
 * Same curated pool as getHeroCovers, but each frame carries its trip slug and
 * a "Location · Year" caption so the home hero can label frames and link each
 * one to its /journal entry.
 */
export function getHeroFrames(): HeroFrame[] {
  const out: HeroFrame[] = [];
  for (const entry of entries) {
    const photo = getTripPhotos(entry.slug)[entry.index - 1];
    if (!photo) {
      continue;
    }
    const trip = TRIPS.find((t) => t.slug === entry.slug);
    const label = trip ? `${trip.location} · ${trip.date.slice(0, 4)}` : "";
    out.push({ label, photo, slug: entry.slug });
  }
  return out;
}

/**
 * Curated cover index (1-based) for a given trip slug, or null if the trip
 * isn't in the hand-picked pool. Used by OG image generation to honor the
 * same cover selection as the home-page hero rotator.
 */
export function getCoverIndex(slug: string): number | null {
  const entry = entries.find((e) => e.slug === slug);
  return entry ? entry.index : null;
}
