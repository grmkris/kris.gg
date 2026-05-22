import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photo-gallery";
import { getProject, PROJECTS } from "@/content/projects";
import { getCoverPhoto, getTripPhotos } from "@/lib/photos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) {
    return {};
  }
  return {
    description: project.tagline,
    openGraph: {
      description: project.tagline,
      siteName: "kris.gg",
      title: project.title,
      type: "article" as const,
      url: `https://kris.gg/building/${slug}`,
    },
    title: project.title,
    twitter: {
      card: "summary_large_image" as const,
      creator: "@_krisgg",
      description: project.tagline,
      title: project.title,
    },
  };
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="mt-10">
      <h2 className="credit-block mb-2 text-xs text-[#737373]">{heading}</h2>
      <p className="font-display text-[1.0625rem] leading-[1.75] text-[#c4bdb1]">
        {body}
      </p>
    </section>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) {
    notFound();
  }

  const photos = getTripPhotos(slug);
  const cover = getCoverPhoto(slug);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {cover ? (
        <div className="absolute top-6 left-6 z-20">
          <Link
            className="rounded-full bg-[#0a0a0a]/60 px-3 py-1 text-xs text-[#e8e8e8] backdrop-blur-sm transition-colors hover:bg-[#0a0a0a]/80"
            href="/building"
          >
            ← Building
          </Link>
        </div>
      ) : null}

      {cover ? (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden bg-[#1a1a1a] md:h-[65vh]">
          <Image
            alt=""
            blurDataURL={cover.blur}
            className="object-cover"
            fill
            placeholder="blur"
            priority
            sizes="100vw"
            src={cover.full}
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        </div>
      ) : null}

      <article
        className={
          cover
            ? "relative mx-auto max-w-2xl px-6 pt-12 pb-16"
            : "relative mx-auto max-w-2xl px-6 pt-20 pb-16"
        }
      >
        {cover ? null : (
          <div className="mb-8">
            <Link
              className="font-sans text-xs uppercase tracking-[0.15em] text-[#525252] transition-colors hover:text-[#f4ede1]"
              href="/building"
            >
              ← Building
            </Link>
          </div>
        )}

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 font-sans text-sm tabular-nums text-[#737373]">
            <span>{project.date}</span>
            <span>·</span>
            <span>{project.role}</span>
            {project.client ? (
              <>
                <span>·</span>
                <span>{project.client}</span>
              </>
            ) : null}
          </div>
          <h1 className="mt-3 font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            {project.title}
          </h1>
          <p className="mt-4 font-display text-lg italic leading-snug text-[#a3a3a3]">
            {project.tagline}
          </p>
        </header>

        {/* Facts block */}
        <div className="mb-2 border-[#262626] border-y py-5">
          {project.metrics && project.metrics.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-x-10 gap-y-3">
              {project.metrics.map((metric) => (
                <div key={metric.label}>
                  <div className="font-display text-2xl text-[#f4ede1]">
                    {metric.value}
                  </div>
                  <div className="credit-block text-[10px] text-[#737373]">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                className="rounded-full border border-[#262626] px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.1em] text-[#737373]"
                key={tech}
              >
                {tech}
              </span>
            ))}
          </div>

          {project.liveUrl || project.repoUrl ? (
            <div className="mt-4 flex gap-4 font-sans text-xs">
              {project.liveUrl ? (
                <a
                  className="text-[#c8472b] transition-colors hover:text-[#f4ede1]"
                  href={project.liveUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Visit live →
                </a>
              ) : null}
              {project.repoUrl ? (
                <a
                  className="text-[#737373] transition-colors hover:text-[#f4ede1]"
                  href={project.repoUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub →
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <Section body={project.problem} heading="The problem" />
        <Section body={project.approach} heading="The approach" />
        <Section body={project.outcome} heading="The outcome" />

        {project.highlights && project.highlights.length > 0 ? (
          <section className="mt-10">
            <h2 className="credit-block mb-3 text-xs text-[#737373]">
              Highlights
            </h2>
            <ul className="space-y-2">
              {project.highlights.map((h) => (
                <li
                  className="flex gap-3 font-display text-[1.0625rem] leading-snug text-[#c4bdb1]"
                  key={h}
                >
                  <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[#c8472b]" />
                  {h}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      {photos.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <PhotoGallery photos={photos} />
        </section>
      ) : null}
    </main>
  );
}
