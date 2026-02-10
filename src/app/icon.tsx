import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#08080d",
          borderRadius: 36,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: "0 0 20px 24px",
          position: "relative",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 132,
            color: "#f0f0f6",
            lineHeight: 1,
          }}
        >
          K
        </span>
        <div
          style={{
            position: "absolute",
            right: 36,
            bottom: 36,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: "#00e5a0",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
