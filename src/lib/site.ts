// Canonical origin for the current deployment, so canonical URLs, Open Graph
// tags, the sitemap and robots never point cross-environment.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL — set per Vercel environment
//      (Production = https://kris.gg, dev branch Preview = https://dev.kris.gg).
//   2. NEXT_PUBLIC_VERCEL_URL — any other Vercel deployment (ad-hoc preview)
//      stays on its own deploy URL instead of leaking the prod domain.
//   3. localhost — local `next dev`.
export const siteUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl !== undefined && vercelUrl !== "") {
    return `https://${vercelUrl}`;
  }
  return "http://localhost:3001";
};

export const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
