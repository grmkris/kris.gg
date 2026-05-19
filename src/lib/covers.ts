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
    if (photo) out.push(photo);
  }
  return out;
}
