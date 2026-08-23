import { ImageResponse } from "next/og";

export const alt = "PRism · See the change. Trace the proof.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#e9f0f5",
        color: "#07111f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "58px 64px",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", fontSize: 30, fontWeight: 700 }}>
        <div style={{ background: "#1648ff", height: 26, marginRight: 14, width: 26 }} />
        PRism
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 960 }}>
        <div style={{ color: "#1648ff", fontSize: 20, letterSpacing: 4, marginBottom: 20 }}>
          EVIDENCE, ASSEMBLED
        </div>
        <div style={{ fontSize: 86, fontWeight: 700, letterSpacing: -5, lineHeight: 0.98 }}>
          Turn the diff into a system you can see.
        </div>
      </div>
      <div style={{ alignItems: "center", display: "flex", fontSize: 19 }}>
        <div style={{ background: "#1648ff", height: 4, marginRight: 12, width: 34 }} />
        Current code
        <div style={{ background: "#7652db", height: 4, marginLeft: 30, marginRight: 12, width: 34 }} />
        Project memory
      </div>
    </div>,
    size,
  );
}
