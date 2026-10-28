import Image from "next/image";
import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photo-gallery";
import { PublicFooter } from "@/components/public-footer";
import { getProject, PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import { getCoverPhoto, getTripPhotos } from "@/lib/photos";
import { siteUrl } from "@/lib/site";

import "@/portfolio.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
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
      url: `${siteUrl()}/building/${slug}`,
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

function ProjectFacts({ project }: { project: Project }) {
  return (
    <dl className="portfolio-facts">
      <div>
        <dt>Date</dt>
        <dd>{project.date}</dd>
      </div>
      <div>
        <dt>Role</dt>
        <dd>{project.role}</dd>
      </div>
      {project.client ? (
        <div>
          <dt>Context</dt>
          <dd>{project.client}</dd>
        </div>
      ) : null}
      {project.metrics?.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProjectSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="portfolio-case-section">
      <h2>{title}</h2>
      <p className="public-body">{body}</p>
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
    <main className="public-page portfolio-case">
      <header className="public-container portfolio-case-header">
        <h1 className="public-title">{project.title}</h1>
        <p className="public-lead">{project.tagline}</p>
        <div className="portfolio-case-byline public-meta">
          <span>{project.date}</span>
          <span>{project.role}</span>
          {project.client ? <span>{project.client}</span> : null}
        </div>
        {project.liveUrl || project.repoUrl ? (
          <div className="portfolio-case-links">
            {project.liveUrl ? (
              <a
                className="public-action"
                href={project.liveUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Visit live
              </a>
            ) : null}
            {project.repoUrl ? (
              <a
                className="public-link"
                href={project.repoUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            ) : null}
          </div>
        ) : null}
      </header>

      {cover ? (
        <div className="public-container">
          <figure className="portfolio-case-cover">
            <Image
              alt=""
              blurDataURL={cover.blur}
              height={cover.height}
              placeholder="blur"
              priority
              sizes="(min-width: 1440px) 1312px, 100vw"
              src={cover.full}
              width={cover.width}
            />
          </figure>
        </div>
      ) : null}

      <article className="public-container portfolio-case-body">
        <aside className="portfolio-case-aside">
          <ProjectFacts project={project} />
          <div className="portfolio-stack">
            <h2>Built with</h2>
            <ul className="portfolio-tags">
              {project.stack.map((tech) => (
                <li className="public-tag" key={tech}>
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div className="portfolio-case-narrative">
          <ProjectSection body={project.problem} title="The problem" />
          <ProjectSection body={project.approach} title="The approach" />
          <ProjectSection body={project.outcome} title="The outcome" />
          {project.highlights?.length ? (
            <section className="portfolio-case-section">
              <h2>Highlights</h2>
              <ul className="portfolio-highlights">
                {project.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>

      {photos.length ? (
        <section className="public-container public-gallery">
          <PhotoGallery photos={photos} />
        </section>
      ) : null}
      <PublicFooter />
    </main>
  );
}
