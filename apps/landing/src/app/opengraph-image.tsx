import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/config";

// Dynamic 1200×630 OG card — branded, code-generated, no binary asset to
// maintain. Applies to the whole site (home + any page without its own).
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg,#060B18 0%,#0B1743 38%,#123A8C 72%,#1E4DE8 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
          gloceries<span style={{ color: "#3B6BFF" }}>.</span>
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 32,
            maxWidth: 900,
          }}
        >
          Groceries from local stores you love — to your door.
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 28,
            color: "#BFD4FF",
            display: "flex",
          }}
        >
          Fresh produce · dairy · kirana · daily essentials · no dark stores
        </div>
      </div>
    ),
    { ...size },
  );
}
