import Image from "next/image";
import Link from "next/link";

import { HeroRotating } from "@/components/hero-rotating";
import { PublicFooter } from "@/components/public-footer";
import { NOTES } from "@/content/notes";
import { PROJECTS } from "@/content/projects";
import { TRIPS } from "@/content/trips";
import { getHeroFrames } from "@/lib/covers";
import { getCoverPhoto } from "@/lib/photos";

export default function Home() {
  const featured = PROJECTS.find((project) => project.slug === "nod");
  const cover = getCoverPhoto("nod");
  const selected = PROJECTS.filter((project) =>
    ["sidequest", "goblin"].includes(project.slug)
  );
  const experience = PROJECTS.find((project) => project.slug === "compilot");
  const frames = getHeroFrames();

  return (
    <main className="public-page">
      <section className="public-container home-hero">
        <div className="home-intro">
          <h1 className="public-headline">
            Kristjan
            <br />
            Grm.
          </h1>
          <p className="public-lead">
            AI, crypto and privacy products, from idea to live.
          </p>
          <div className="home-actions">
            <a className="public-action" href="#contact">
              Get in touch
            </a>
            <Link className="public-link" href="/building">
              Explore the work
            </Link>
          </div>
        </div>
        {featured && cover ? (
          <figure className="home-proof">
            <Link
              className="home-proof-image"
              href={`/building/${featured.slug}`}
              aria-label="View the Nod case study"
            >
              <Image
                src={cover.full}
                alt="Nod’s public wallet homepage"
                width={cover.width}
                height={cover.height}
                priority
                sizes="(min-width: 960px) 60vw, 95vw"
              />
            </Link>
            <figcaption className="home-proof-caption">
              <h2>
                <Link
                  className="public-link"
                  href={`/building/${featured.slug}`}
                >
                  {featured.title}
                </Link>
              </h2>
              <p className="public-caption">Give your AI an allowance.</p>
              <span className="public-meta">HackMeridian 2026</span>
            </figcaption>
          </figure>
        ) : null}
      </section>

      <section
        className="public-container home-work"
        aria-labelledby="home-work-title"
      >
        <div className="home-section-heading">
          <h2 className="public-section-title" id="home-work-title">
            Agents at work.
          </h2>
          <Link
            className="public-link"
            href="/building"
          >{`All ${PROJECTS.length} projects`}</Link>
        </div>
        <div className="home-work-grid">
          {selected.map((project) => {
            const image = getCoverPhoto(project.slug);
            return (
              <Link
                className="home-work-item"
                href={`/building/${project.slug}`}
                key={project.slug}
              >
                {image ? (
                  <Image
                    src={image.full}
                    width={image.width}
                    height={image.height}
                    alt=""
                    sizes="(min-width: 960px) 50vw, 95vw"
                  />
                ) : null}
                <div className="home-work-caption">
                  <h3>{project.title}</h3>
                  <p>{project.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <Link className="home-platform-row" href="/building/myapps">
          <h3>MyApps</h3>
          <p>
            A connected suite of agent-native products, built around one human
            identity.
          </p>
        </Link>
      </section>

      {experience ? (
        <section className="home-experience">
          <div className="public-container home-experience-inner">
            <div className="home-experience-copy">
              <h2 className="public-section-title">Compilot / Nexera</h2>
              <p className="public-lead">
                Production compliance and identity infrastructure.
              </p>
              <p className="public-meta">
                CTO, architect and lead full-stack engineer, 2022 to 2025.
              </p>
              <Link className="public-link" href="/building/compilot">
                Read the case study
              </Link>
            </div>
            <dl className="home-experience-facts">
              {experience.metrics?.map((metric) => (
                <div key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="public-container home-personal">
        <HeroRotating frames={frames} />
        <div className="home-personal-copy">
          <h2 className="public-section-title">Away from the terminal.</h2>
          <p className="public-body">
            Hackathons keep the passport busy. Life outside the terminal is a
            cat, mountain trails, badminton, and good techno.
          </p>
          <p className="public-meta">Ljubljana, Slovenia</p>
          <Link
            className="public-link"
            href="/journal"
          >{`Journal, ${TRIPS.length} entries`}</Link>
        </div>
      </section>

      <section className="public-container home-notes">
        <div className="home-section-heading">
          <div>
            <h2 className="public-section-title">Field notes.</h2>
            <p className="public-lead">Engineering patterns from the work.</p>
          </div>
          <Link
            className="public-link"
            href="/notes"
          >{`All ${NOTES.length} notes`}</Link>
        </div>
        <div className="home-note-list">
          {NOTES.map((note) => (
            <Link
              className="home-note-row"
              href={`/notes/${note.slug}`}
              key={note.slug}
            >
              <h3>{note.title}</h3>
              <time className="public-meta" dateTime={`${note.date}-01`}>
                {note.date}
              </time>
            </Link>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
