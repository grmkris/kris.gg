import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0a0a0a",
        borderRadius: 40,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontFamily: "monospace",
          fontSize: 100,
          fontWeight: 700,
        }}
      >
        K
      </div>
    </div>,
    { ...size }
  );
}
