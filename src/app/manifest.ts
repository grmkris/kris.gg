import type { MetadataRoute } from "next";

/**
 * Installable app manifest. The public site is static and needs none of this —
 * it exists for `/stash`, which is the only thing here worth putting on a home
 * screen, hence `start_url`.
 *
 * `share_target` uses **GET**. A POST target must be intercepted by a service
 * worker, and this site has none; GET arrives as ordinary query parameters that
 * `/stash/share` reads server-side. The cost is that only text and links can be
 * shared, not files — sharing an image into the stash would need POST +
 * `multipart/form-data` + a service worker.
 *
 * Neither `share_target` nor `shortcuts` does anything on iOS: Safari supports
 * neither. Add-to-Home-Screen still works (standalone display, icon), and the
 * iPhone share-sheet route is the Shortcuts.app recipe in
 * `scripts/ios-shortcut.md`.
 *
 * Icons are concrete files under `public/` rather than the `next/og` routes used
 * for the favicon — an installer fetches these once and wants stable paths. See
 * `scripts/build-icons.ts`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0a0a0a",
    description: "Private capture inbox.",
    display: "standalone",
    icons: [
      { sizes: "192x192", src: "/icon-192.png", type: "image/png" },
      { sizes: "512x512", src: "/icon-512.png", type: "image/png" },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icon-maskable-512.png",
        type: "image/png",
      },
    ],
    id: "/stash",
    name: "Stash — kris.gg",
    // Not limited to /stash: following a link out to the site should stay in
    // the installed window rather than bouncing to the browser.
    scope: "/",
    share_target: {
      action: "/stash/share",
      method: "GET",
      params: { text: "text", title: "title", url: "url" },
    },
    short_name: "Stash",
    shortcuts: [
      {
        description: "Open the stash with the composer focused",
        name: "New capture",
        short_name: "Capture",
        url: "/stash?compose=1",
      },
    ],
    start_url: "/stash",
    theme_color: "#0a0a0a",
  };
}
