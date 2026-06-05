import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      lastModified: new Date(),
      url: siteUrl(),
    },
  ];
}
