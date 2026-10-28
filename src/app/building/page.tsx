import Image from "next/image";
import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";
import { PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import { getCoverPhoto } from "@/lib/photos";
import type { PhotoMeta } from "@/lib/photos";

import "@/portfolio.css";

export const metadata = {
  description:
    "Selected work by Kristjan Grm — production AI, full-stack, and web3 products.",
  title: "Building",
};

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "In progress",
  live: "Live",
  shipped: "Shipped",
};

function FeatureProject({
  project,
  cover,
}: {
  project: Project;
  cover: PhotoMeta;
}) {
  return (
    <Link className="portfolio-feature" href={`/building/${project.slug}`}>
      <div className="portfolio-feature-heading">
        <h2>{project.title}</h2>
        <span className="public-meta">{STATUS_LABEL[project.status]}</span>
      </div>
      <figure className="portfolio-feature-image">
        <Image
          alt=""
          blurDataURL={cover.blur}
          height={cover.height}
          placeholder="blur"
          sizes="(min-width: 960px) 50vw, 100vw"
          src={cover.full}
          width={cover.width}
        />
      </figure>
      <p className="portfolio-feature-description">{project.tagline}</p>
      <div className="portfolio-feature-meta public-meta">
        <span>{project.role}</span>
        <span>{project.date}</span>
      </div>
    </Link>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link className="portfolio-project-row" href={`/building/${project.slug}`}>
      <h3 className="portfolio-project-title">{project.title}</h3>
      <p className="portfolio-project-tagline">{project.tagline}</p>
      <div className="portfolio-row-meta public-meta">
        <span>{project.role}</span>
        <span>{project.date}</span>
        <span>{STATUS_LABEL[project.status]}</span>
      </div>
    </Link>
  );
}

export default function BuildingIndex() {
  const featured = PROJECTS.flatMap((project) => {
    const cover = getCoverPhoto(project.slug);
    return project.status !== "shipped" && cover ? [{ project, cover }] : [];
  });
  const remaining = PROJECTS.filter(
    (project) => !featured.some((entry) => entry.project.slug === project.slug)
  );

  return (
    <main className="public-page portfolio-page">
      <header className="public-container portfolio-page-header">
        <h1 className="public-title">Building</h1>
        <p className="public-lead">
          Production AI, full-stack, and web3 products. Taken from idea to live,
          fast.
        </p>
      </header>

      <section
        aria-label="Current work"
        className="public-container portfolio-feature-list"
      >
        {featured.map(({ project, cover }) => (
          <FeatureProject cover={cover} key={project.slug} project={project} />
        ))}
      </section>

      <section className="public-container portfolio-index">
        <h2 className="public-section-title">More work</h2>
        <div className="portfolio-project-list">
          {remaining.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
