import { ImageResponse } from "next/og";

import { getProject, PROJECTS } from "@/content/projects";
import { embedPhoto, loadOgFonts, resolveTripCover } from "@/lib/og";

export const runtime = "nodejs";
export const dynamicParams = false;
export const alt = "kris.gg — selected work";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

const STATUS_LABEL: Record<string, string> = {
  active: "IN PROGRESS",
  live: "LIVE",
  shipped: "SHIPPED",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) {
    throw new Error(`No project for slug ${slug}`);
  }

  const cover = resolveTripCover(slug);
  const photoDataUrl = cover ? await embedPhoto(cover.full) : null;
  const fonts = await loadOgFonts();

  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        display: "flex",
        fontFamily: "Fraunces",
        height: 630,
        position: "relative",
        width: 1200,
      }}
    >
      {photoDataUrl ? (
        // biome-ignore lint/performance/noImgElement: ImageResponse renders raw img
        <img
          alt=""
          src={photoDataUrl}
          style={{
            display: "flex",
            height: 630,
            left: 0,
            objectFit: "cover",
            position: "absolute",
            top: 0,
            width: 1200,
          }}
        />
      ) : null}

      <div
        style={{
          background: photoDataUrl
            ? "linear-gradient(to bottom, rgba(10,10,10,0.10) 0%, rgba(10,10,10,0.10) 30%, rgba(10,10,10,0.90) 70%, #0a0a0a 100%)"
            : "linear-gradient(135deg, #0a0a0a 0%, #141414 60%, #0a0a0a 100%)",
          display: "flex",
          height: 630,
          left: 0,
          position: "absolute",
          top: 0,
          width: 1200,
        }}
      />

      <div
        style={{
          alignItems: "flex-end",
          bottom: 64,
          display: "flex",
          justifyContent: "space-between",
          left: 72,
          position: "absolute",
          right: 72,
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}
        >
          <div
            style={{
              color: "#a3a3a3",
              display: "flex",
              fontFamily: "Hanken Grotesk",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <span>{STATUS_LABEL[project.status] ?? ""}</span>
            <span style={{ color: "#525252", margin: "0 14px" }}>·</span>
            <span>{project.role}</span>
          </div>

          <div
            style={{
              color: "#f4ede1",
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 88,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginTop: 14,
            }}
          >
            {project.title}
          </div>

          <div
            style={{
              background: "#c8472b",
              display: "flex",
              height: 2,
              marginTop: 20,
              width: 72,
            }}
          />

          <div
            style={{
              color: "#c4bdb1",
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 27,
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1.35,
              marginTop: 18,
              maxWidth: 860,
            }}
          >
            {project.tagline}
          </div>
        </div>

        <div
          style={{
            color: "#737373",
            display: "flex",
            fontFamily: "Hanken Grotesk",
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.18em",
            paddingBottom: 6,
            textTransform: "uppercase",
          }}
        >
          kris.gg
        </div>
      </div>
    </div>,
    { ...size, fonts }
  );
}
