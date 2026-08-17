import { Suspense } from "react";

import { StashEntry } from "./stash-entry";

// Private tool. Keep it out of search engines and the sitemap regardless of
// which environment it is deployed to.
export const metadata = {
  robots: { follow: false, index: false },
  title: "Stash",
};

export default function StashPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        {/* `useSearchParams` needs a boundary for the page to stay static. */}
        <Suspense>
          <StashEntry />
        </Suspense>
      </div>
    </main>
  );
}
