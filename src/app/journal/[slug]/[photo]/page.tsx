import { notFound } from "next/navigation";

import { TRIPS } from "@/content/trips";
import { getTripPhotos } from "@/lib/photos";
import { siteUrl } from "@/lib/site";

import { TripView } from "../trip-view";

interface PageProps {
  params: Promise<{ slug: string; photo: string }>;
}

// One static permalink per photo: /journal/<slug>/<id>
export function generateStaticParams() {
  return TRIPS.flatMap((t) =>
    getTripPhotos(t.slug).map((p) => ({ photo: p.id, slug: t.slug }))
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, photo } = await params;
  const trip = TRIPS.find((t) => t.slug === slug);
  const pic = getTripPhotos(slug).find((p) => p.id === photo);
  if (!(trip && pic)) {
    return {};
  }
  const url = `${siteUrl()}/journal/${slug}/${photo}`;
  // OG image is the photo itself (its source JPEG — broadly supported in cards),
  // so a shared per-photo link previews that exact image.
  const image = {
    height: pic.height,
    url: pic.src, // already an absolute R2 URL
    width: pic.width,
  };
  return {
    description: trip.description,
    openGraph: {
      description: trip.description,
      images: [image],
      siteName: "kris.gg",
      title: trip.title,
      type: "article" as const,
      url,
    },
    title: trip.title,
    twitter: {
      card: "summary_large_image" as const,
      creator: "@_krisgg",
      description: trip.description,
      images: [image.url],
      title: trip.title,
    },
  };
}

export default async function PhotoPermalink({ params }: PageProps) {
  const { slug, photo } = await params;
  const exists = getTripPhotos(slug).some((p) => p.id === photo);
  if (!exists) {
    notFound();
  }
  return <TripView initialPhotoId={photo} slug={slug} />;
}
