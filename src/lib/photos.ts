import photosData from "@/content/photos.generated.json";

export interface PhotoMeta {
  src: string;
  thumb: string;
  mid: string;
  full: string;
  width: number;
  height: number;
  blur: string;
}

const data = photosData as Record<string, PhotoMeta[]>;

export function getTripPhotos(slug: string): PhotoMeta[] {
  return data[slug] ?? [];
}

export function getCoverPhoto(slug: string): PhotoMeta | null {
  const photos = getTripPhotos(slug);
  return photos[0] ?? null;
}
