import { ImageResponse } from "next/og";

// Static link-preview card (KakaoTalk / Twitter / etc.). English-only so it
// renders with the default font — no Korean web-font loading needed.
export const alt = "What's in my closet — AI wardrobe manager";
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
          padding: "72px 80px",
          background: "#f7f5ef",
          color: "#2b2823",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: "#5e6a4c",
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "#5e6a4c",
              letterSpacing: -0.5,
            }}
          >
            What&rsquo;s in my closet
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}
          >
            Know what you own.
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#5e6a4c",
            }}
          >
            Stop impulse buying.
          </div>
          <div style={{ fontSize: 31, marginTop: 30, color: "#6b6256" }}>
            AI wardrobe — visual duplicate detection · location tracking · live
            inventory
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 24, color: "#8a8275" }}>
            whats-in-my-closet-web.vercel.app
          </div>
          <div style={{ fontSize: 24, color: "#8a8275" }}>
            Next.js · tRPC · pgvector
          </div>
        </div>
      </div>
    ),
    size,
  );
}
