import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#08080d",
          borderRadius: 36,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: "0 0 18px 22px",
          position: "relative",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 124,
            color: "#f0f0f6",
            lineHeight: 1,
          }}
        >
          K
        </span>
        <div
          style={{
            position: "absolute",
            right: 32,
            bottom: 32,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: "#00e5a0",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
