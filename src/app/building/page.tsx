import Image from "next/image";
import Link from "next/link";

import { PROJECTS, type Project } from "@/content/projects";
import { getCoverPhoto, type PhotoMeta } from "@/lib/photos";

export const metadata = {
  description:
    "Selected work by Kristjan Grm — production AI, full-stack, and web3 products.",
  title: "Building",
};

const SIGNATURE_STACK =
  "Bun · Hono · oRPC · Drizzle / Postgres · Better Auth · Next.js · Turborepo";

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "In progress",
  live: "Live",
  shipped: "Shipped",
};

function StatusDot({ status }: { status: Project["status"] }) {
  const color =
    status === "live"
      ? "bg-[#c8472b]"
      : (status === "active"
        ? "bg-[#c8472b]/50"
        : "bg-[#525252]");
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function ProjectRow({
  project,
  cover,
}: {
  project: Project;
  cover: PhotoMeta | null;
}) {
  return (
    <Link
      className="group relative block border-t border-[#1a1a1a] py-6 transition-colors hover:border-[#333]"
      href={`/building/${project.slug}`}
    >
      <div className="flex items-center gap-3">
        <StatusDot status={project.status} />
        <h2 className="font-display text-2xl text-[#f4ede1] md:text-3xl">
          {project.title}
        </h2>
        <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-[#525252]">
          {STATUS_LABEL[project.status]}
        </span>
      </div>
      <p className="mt-2 max-w-2xl font-display text-[1.0625rem] italic leading-snug text-[#a3a3a3]">
        {project.tagline}
      </p>
      <div className="mt-3 font-sans text-xs uppercase tracking-[0.12em] text-[#737373]">
        {project.role}
        {project.date ? ` · ${project.date}` : ""}
      </div>

      {cover ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[-13rem] hidden h-32 w-48 -translate-y-1/2 overflow-hidden rounded-sm opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 xl:block"
        >
          <Image
            alt=""
            blurDataURL={cover.blur}
            className="object-cover"
            fill
            placeholder="blur"
            sizes="192px"
            src={cover.mid}
          />
        </div>
      ) : null}
    </Link>
  );
}

export default function BuildingIndex() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 md:px-12 md:pt-24">
        <header className="mb-12">
          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-[#f4ede1] md:text-6xl">
            Building
          </h1>
          <p className="mt-4 max-w-xl font-display text-lg italic leading-snug text-[#a3a3a3]">
            Production AI, full-stack, and web3 products — taken from idea to
            live, fast.
          </p>
          <p className="mt-5 font-sans text-xs uppercase tracking-[0.12em] text-[#737373]">
            {SIGNATURE_STACK}
          </p>
        </header>

        <section className="space-y-12">
          <div>
            <p className="credit-block mb-2 text-xs text-[#525252]">
              Currently
            </p>
            {PROJECTS.filter((p) => p.status !== "shipped").map((project) => (
              <ProjectRow
                cover={getCoverPhoto(project.slug)}
                key={project.slug}
                project={project}
              />
            ))}
          </div>
          {PROJECTS.some((p) => p.status === "shipped") && (
            <div>
              <p className="credit-block mb-2 text-xs text-[#525252]">
                Earlier
              </p>
              {PROJECTS.filter((p) => p.status === "shipped").map((project) => (
                <ProjectRow
                  cover={getCoverPhoto(project.slug)}
                  key={project.slug}
                  project={project}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
