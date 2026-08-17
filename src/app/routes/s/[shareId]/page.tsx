import { SharedView } from "./shared-view";

// A shared route is readable by anyone holding the link, but it is still not
// content — keep it out of search engines and the sitemap.
export const metadata = {
  robots: { follow: false, index: false },
  title: "Shared route",
};

export default async function SharedRoutePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        <SharedView shareId={shareId} />
      </div>
    </main>
  );
}
