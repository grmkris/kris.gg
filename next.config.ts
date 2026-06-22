import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  // "Now" was merged into /building; keep the old path alive.
  async redirects() {
    return [{ destination: "/building", permanent: true, source: "/now" }];
  },
  // Photos live on Cloudflare R2 (i.kris.gg) as pre-sized, content-hashed WebP
  // variants. Serve them as-is: re-optimizing exact-width WebP through Vercel's
  // image optimizer wastes time + quota for no gain, so disable optimization.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
