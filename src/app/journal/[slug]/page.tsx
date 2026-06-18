import { TRIPS } from "@/content/trips";
import { siteUrl } from "@/lib/site";

import { TripView } from "./trip-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TRIPS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) {
    return {};
  }
  const url = `${siteUrl()}/journal/${slug}`;
  return {
    description: trip.description,
    openGraph: {
      description: trip.description,
      publishedTime: `${trip.date}-01`,
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
      title: trip.title,
    },
  };
}

export default async function JournalPost({ params }: PageProps) {
  const { slug } = await params;
  return <TripView slug={slug} />;
}
