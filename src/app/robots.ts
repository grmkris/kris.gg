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
      // Private tools — both are also noindex'd at the page level.
      disallow: ["/stash", "/routes"],
      userAgent: "*",
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
