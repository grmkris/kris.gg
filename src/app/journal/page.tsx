import Link from "next/link";
import { FLAGS } from "@/content/flags";
import { POSTS } from "@/content/journal";

export const metadata = {
  title: "Journal — Kristjan Grm",
  description: "Trip notes and longer-form posts.",
};

export default function JournalIndex() {
  const years = [...new Set(POSTS.map((p) => p.date.slice(0, 4)))];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-2xl px-6 py-16">
        <div className="mb-12">
          <Link
            href="/"
            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
          >
            ← Back
          </Link>
          <h1 className="mt-4 text-lg font-medium">Journal</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Trip notes and longer-form posts.
          </p>
        </div>

        {POSTS.length === 0 ? (
          <p className="text-sm text-[#525252]">No posts yet.</p>
        ) : (
          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                <h3 className="mb-4 text-xs font-medium text-[#404040]">
                  {year}
                </h3>
                <div className="space-y-6">
                  {POSTS.filter((p) => p.date.startsWith(year)).map((post) => (
                    <Link
                      key={post.slug}
                      href={`/journal/${post.slug}`}
                      className="block border-l border-[#1a1a1a] pl-4 transition-colors hover:border-[#333]"
                    >
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <span>{post.date}</span>
                        <span>·</span>
                        <span>{FLAGS[post.location] ?? "🌍"}</span>
                        <span>{post.location}</span>
                      </div>
                      <h4 className="mt-1 font-medium text-[#e8e8e8]">
                        {post.title}
                      </h4>
                      <p className="mt-0.5 text-sm text-[#737373]">
                        {post.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
