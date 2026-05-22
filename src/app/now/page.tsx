import Link from "next/link";

export const metadata = {
  description: "What Kristjan Grm is building right now.",
  title: "Now",
};

const NOW = [
  {
    name: "Invok",
    slug: "invok",
    text: "A self-hostable platform for autonomous Claude Code agents. Currently deepening the integration surface and the cloud tier.",
  },
  {
    name: "Sonara",
    slug: "sonara",
    text: "Real-time AI visuals synced to live audio at 60fps. Refining the shader presets and the audio→intent pipeline.",
  },
  {
    name: "StyleLab",
    slug: "stylelab",
    text: "A full-stack AI fashion app across web and native. Iterating on virtual try-on quality and the wardrobe model.",
  },
];

export default function NowPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-2xl px-6 pt-16 pb-24 md:pt-24">
        <div className="mb-12">
          <Link
            className="font-sans text-xs uppercase tracking-[0.15em] text-[#525252] transition-colors hover:text-[#f4ede1]"
            href="/"
          >
            ← Kristjan Grm
          </Link>
        </div>

        <header className="mb-12">
          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            Now
          </h1>
          <p className="mt-4 font-display text-lg italic leading-snug text-[#a3a3a3]">
            What I'm actively building. A{" "}
            <a
              className="underline decoration-[#404040] underline-offset-2 transition-colors hover:text-[#f4ede1]"
              href="https://nownownow.com/about"
              rel="noopener noreferrer"
              target="_blank"
            >
              /now page
            </a>
            .
          </p>
        </header>

        <section className="space-y-8">
          {NOW.map((item) => (
            <div className="border-[#1a1a1a] border-t pt-6" key={item.name}>
              <Link
                className="font-display text-2xl text-[#f4ede1] transition-colors hover:text-[#c8472b]"
                href={`/building/${item.slug}`}
              >
                {item.name}
              </Link>
              <p className="mt-2 font-display text-[1.0625rem] leading-[1.7] text-[#c4bdb1]">
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <footer className="mt-16 border-[#1a1a1a] border-t pt-8 font-sans text-sm text-[#737373]">
          See all{" "}
          <Link
            className="text-[#a3a3a3] underline decoration-[#404040] underline-offset-2 transition-colors hover:text-[#f4ede1]"
            href="/building"
          >
            selected work →
          </Link>
        </footer>
      </div>
    </main>
  );
}
