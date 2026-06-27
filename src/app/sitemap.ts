import type { MetadataRoute } from "next";

import { NOTES } from "@/content/notes";
import { PROJECTS } from "@/content/projects";
import { TRIPS } from "@/content/trips";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  const paths = [
    "",
    "/building",
    "/journal",
    "/notes",
    ...TRIPS.map((t) => `/journal/${t.slug}`),
    ...PROJECTS.map((p) => `/building/${p.slug}`),
    ...NOTES.map((n) => `/notes/${n.slug}`),
  ];

  return paths.map((path) => ({
    lastModified,
    url: `${base}${path}`,
  }));
}
