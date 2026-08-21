import { ImageResponse } from "next/og";

export const alt = "Latestfile — declare how you use AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0c0e",
          color: "#e8e8ea",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#9aa0a6" }}>
          <span>latestfile</span>
          <span style={{ color: "#3a3d44" }}>&nbsp;·&nbsp;</span>
          <span>latest.dev</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: "flex" }}>Declare how you</div>
            <div style={{ display: "flex" }}>use AI.</div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 34,
              color: "#9aa0a6",
              lineHeight: 1.3,
            }}
          >
            An open, portable format for your AI setup.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "#5aa2ff",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              border: "1px solid #23252a",
              borderRadius: 10,
              background: "#141619",
              color: "#e8e8ea",
              fontFamily: "monospace",
              fontSize: 26,
            }}
          >
            .latestfile
          </div>
          <span style={{ color: "#9aa0a6" }}>
            package.json for how your team uses AI
          </span>
        </div>
      </div>
    ),
    size
  );
}
