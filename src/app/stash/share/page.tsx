import { Suspense } from "react";

import { StashEntry } from "../stash-entry";

// Same rules as /stash — private, and never indexed.
export const metadata = {
  robots: { follow: false, index: false },
  title: "Stash",
};

/**
 * The PWA share target (see `src/app/manifest.ts`).
 *
 * Android's share sheet lands here with `title`, `text` and `url` as query
 * parameters — GET rather than POST, so no service worker is involved, and the
 * page can stay static while `StashEntry` reads the parameters on the client.
 *
 * The composer is **prefilled rather than auto-saved**. Auto-saving would double
 * post on a reload or a back-navigation, and a share sheet is exactly where
 * people fire twice by accident.
 */
export default function StashSharePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        <Suspense>
          <StashEntry />
        </Suspense>
      </div>
    </main>
  );
}
