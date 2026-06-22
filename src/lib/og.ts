import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

import { getCoverIndex } from "@/lib/covers";
import { getTripPhotos, type PhotoMeta } from "@/lib/photos";

// Satori font shape — { name, data, weight, style }. Cached at module scope
// so repeated builds in the same process share one read.
interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 300 | 400 | 500;
  style: "normal" | "italic";
}

let cachedFonts: OgFont[] | null = null;

async function readFontFile(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), "public/fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cachedFonts) {
    return cachedFonts;
  }
  const [fraunces, frauncesItalic, hanken] = await Promise.all([
    readFontFile("Fraunces-Light.woff"),
    readFontFile("Fraunces-Italic.woff"),
    readFontFile("HankenGrotesk-Medium.woff"),
  ]);
  cachedFonts = [
    { data: fraunces, name: "Fraunces", style: "normal", weight: 300 },
    { data: frauncesItalic, name: "Fraunces", style: "italic", weight: 400 },
    { data: hanken, name: "Hanken Grotesk", style: "normal", weight: 500 },
  ];
  return cachedFonts;
}

// In-process cache for transcoded JPEG bytes. Build statically renders 26
// trips × 2 (OG + Twitter) = 52 invocations, so a small cache saves the
// duplicate decode/encode work for the Twitter route.
const photoCache = new Map<string, string>();

// Fetch a photo and return a JPEG data URL inline-embedded in JSX. Photos now
// live on R2 (photos.generated.json stores absolute URLs), so we fetch the
// bytes; a non-URL path falls back to reading /public. The pipeline outputs
// WebP, but @vercel/og's bundled Satori (0.7.2) has a stub WebP decoder —
// feeding it WebP causes "Spread syntax requires ...iterable" at render time —
// so we always decode → JPEG via sharp before handing to Satori.
export async function embedPhoto(photoSrc: string): Promise<string> {
  const cached = photoCache.get(photoSrc);
  if (cached) {
    return cached;
  }
  let input: Buffer;
  if (/^https?:\/\//.test(photoSrc)) {
    const res = await fetch(photoSrc);
    if (!res.ok) {
      throw new Error(
        `embedPhoto: failed to fetch ${photoSrc} (${res.status} ${res.statusText})`
      );
    }
    input = Buffer.from(await res.arrayBuffer());
  } else {
    input = await readFile(
      // Strip any ?v=… cache-bust query before reading from disk.
      join(
        process.cwd(),
        "public",
        photoSrc.replace(/\?.*$/, "").replace(/^\//, "")
      )
    );
  }
  const jpegBuf = await sharp(input).jpeg({ quality: 85 }).toBuffer();
  const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;
  photoCache.set(photoSrc, dataUrl);
  return dataUrl;
}

// "2026-05" → "MAY 2026"
export function formatTripDate(date: string): string {
  const [year, month] = date.split("-");
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const idx = Number(month) - 1;
  const m = idx >= 0 && idx < 12 ? months[idx] : "";
  return m ? `${m} ${year}` : year;
}

// Pick the cover photo for the OG card. Prefers the hand-curated index from
// covers.generated.json (so OGs match the home-page hero rotator), and falls
// back to photos[0]. Returns null if the trip has no photos.
export function resolveTripCover(slug: string): PhotoMeta | null {
  const photos = getTripPhotos(slug);
  if (photos.length === 0) {
    return null;
  }
  const curated = getCoverIndex(slug);
  if (curated !== null) {
    const c = photos[curated - 1];
    if (c) {
      return c;
    }
  }
  return photos[0] ?? null;
}
