import { ImageResponse } from "next/og";

import { FLAGS } from "@/content/flags";
import { TRIPS } from "@/content/trips";
import {
  embedPhoto,
  formatTripDate,
  loadOgFonts,
  resolveTripCover,
} from "@/lib/og";

export const runtime = "nodejs";
export const alt = "kris.gg journal entry";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export function generateStaticParams() {
  return TRIPS.map((t) => ({ slug: t.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = TRIPS.find((t) => t.slug === slug);
  if (!trip) {
    throw new Error(`No trip for slug ${slug}`);
  }

  const cover = resolveTripCover(slug);
  const photoDataUrl = cover ? await embedPhoto(cover.full) : null;
  const fonts = await loadOgFonts();
  const flag = FLAGS[trip.location];

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
      {photoDataUrl && (
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
      )}

      {/* Dark gradient overlay — fades photo into the typography zone */}
      <div
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.10) 0%, rgba(10,10,10,0.10) 35%, rgba(10,10,10,0.88) 72%, #0a0a0a 100%)",
          display: "flex",
          height: 630,
          left: 0,
          position: "absolute",
          top: 0,
          width: 1200,
        }}
      />

      {/* Bottom-aligned content block */}
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
        {/* Typography column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 880,
          }}
        >
          {/* Meta strip */}
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
            <span>{formatTripDate(trip.date)}</span>
            <span style={{ color: "#525252", margin: "0 14px" }}>·</span>
            <span>
              {flag ? `${flag}  ` : ""}
              {trip.location}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              color: "#f4ede1",
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 84,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              marginTop: 14,
            }}
          >
            {trip.title}
          </div>

          {/* Rust accent line */}
          <div
            style={{
              background: "#c8472b",
              display: "flex",
              height: 2,
              marginTop: 22,
              width: 72,
            }}
          />

          {/* Description */}
          <div
            style={{
              color: "#c4bdb1",
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 28,
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1.35,
              marginTop: 18,
              maxWidth: 820,
            }}
          >
            {trip.description}
          </div>

          {/* Optional hackathon credit */}
          {trip.prizes !== undefined && (
            <div
              style={{
                color: "#c8472b",
                display: "flex",
                fontFamily: "Hanken Grotesk",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "0.04em",
                marginTop: 18,
              }}
            >
              {trip.event ? `${trip.event} · ` : ""}
              {trip.prizes}
            </div>
          )}
        </div>

        {/* Signature */}
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
          kris.gg →
        </div>
      </div>
    </div>,
    { ...size, fonts }
  );
}
