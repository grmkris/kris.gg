import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kristjan Grm - kris.gg";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, #0a0a0a 0%, #141420 50%, #0a0a0a 100%)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Subtle grid pattern */}
      <div
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          display: "flex",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      {/* Accent glow */}
      <div
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)",
          display: "flex",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      {/* Name */}
      <div
        style={{
          color: "#ffffff",
          display: "flex",
          fontFamily: "monospace",
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: "-2px",
          marginBottom: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        Kristjan Grm
      </div>

      {/* Domain */}
      <div
        style={{
          color: "#525252",
          display: "flex",
          fontFamily: "monospace",
          fontSize: 28,
          position: "relative",
          zIndex: 1,
        }}
      >
        kris.gg
      </div>
    </div>,
    { ...size }
  );
}
