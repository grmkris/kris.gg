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

// Read a photo from /public and return a JPEG data URL inline-embedded in
// JSX. The photo pipeline outputs WebP, but @vercel/og's bundled Satori
// (0.7.2) has a stub WebP decoder — feeding it WebP causes "Spread syntax
// requires ...iterable" at render time. So we always decode → JPEG via
// sharp before handing to Satori.
export async function embedPhoto(publicRelativePath: string): Promise<string> {
  const cached = photoCache.get(publicRelativePath);
  if (cached) {
    return cached;
  }
  const absPath = join(
    process.cwd(),
    "public",
    // Strip any ?v=… cache-bust query before reading from disk.
    publicRelativePath.replace(/\?.*$/, "").replace(/^\//, "")
  );
  const jpegBuf = await sharp(absPath).jpeg({ quality: 85 }).toBuffer();
  const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;
  photoCache.set(publicRelativePath, dataUrl);
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
