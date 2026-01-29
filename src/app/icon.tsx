import { ImageResponse } from "next/og";

export const size = { height: 32, width: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0a0a0a",
        borderRadius: 6,
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
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        K
      </div>
    </div>,
    { ...size }
  );
}
