import coversData from "@/content/covers.generated.json";
import { getTripPhotos, type PhotoMeta } from "@/lib/photos";

interface CoverEntry {
  slug: string;
  index: number;
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
 * Curated cover index (1-based) for a given trip slug, or null if the trip
 * isn't in the hand-picked pool. Used by OG image generation to honor the
 * same cover selection as the home-page hero rotator.
 */
export function getCoverIndex(slug: string): number | null {
  const entry = entries.find((e) => e.slug === slug);
  return entry ? entry.index : null;
}
