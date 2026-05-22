import { ImageResponse } from "next/og";

import { getHeroCovers } from "@/lib/covers";
import { embedPhoto, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Kristjan Grm — kris.gg";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();
  const covers = getHeroCovers().slice(0, 3);
  const thumbs = await Promise.all(
    covers.map(async (c) => embedPhoto(c.thumb))
  );

  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Fraunces",
        height: 630,
        padding: 72,
        position: "relative",
        width: 1200,
      }}
    >
      {/* Thumbnail strip */}
      <div style={{ display: "flex", gap: 16 }}>
        {thumbs.map((src, i) => (
          // biome-ignore lint/performance/noImgElement: ImageResponse renders raw img
          <img
            key={`og-thumb-${i.toString()}`}
            alt=""
            src={src}
            style={{
              display: "flex",
              height: 165,
              objectFit: "cover",
              width: 220,
            }}
          />
        ))}
      </div>

      {/* Spacer */}
      <div style={{ display: "flex", flex: 1 }} />

      {/* Headline block */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#f4ede1",
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: 124,
            fontWeight: 300,
            letterSpacing: "-0.025em",
            lineHeight: 0.98,
          }}
        >
          Kristjan Grm
        </div>

        <div
          style={{
            background: "#c8472b",
            display: "flex",
            height: 2,
            marginTop: 26,
            width: 88,
          }}
        />

        <div
          style={{
            color: "#c4bdb1",
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: 400,
            lineHeight: 1.3,
            marginTop: 22,
          }}
        >
          Building at the AI × crypto × privacy intersection.
        </div>
      </div>

      {/* Signature — bottom right */}
      <div
        style={{
          bottom: 72,
          color: "#737373",
          display: "flex",
          fontFamily: "Hanken Grotesk",
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "0.22em",
          position: "absolute",
          right: 72,
          textTransform: "uppercase",
        }}
      >
        kris.gg
      </div>
    </div>,
    { ...size, fonts }
  );
}
