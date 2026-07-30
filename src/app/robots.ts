import type { MetadataRoute } from "next";

import { isProd, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Keep non-prod deployments (dev.kris.gg, previews) out of search indexes.
  if (!isProd) {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    };
  }
  return {
    rules: {
      allow: "/",
      // Private capture inbox — also noindex'd at the page level.
      disallow: "/stash",
      userAgent: "*",
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
