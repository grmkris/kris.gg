import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  // Photos are served as static CDN assets and OG images are prerendered at
  // build time, so no serverless function needs to read them at runtime.
  // Without this, @vercel/nft traces all of public/photos (~423 MB) into the
  // OG/page function bundles and blows past Vercel's 250 MB function limit.
  outputFileTracingExcludes: {
    "/*": ["public/photos/**/*"],
  },
};

export default nextConfig;
