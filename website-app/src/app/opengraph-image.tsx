import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wazelo CRM — WhatsApp CRM for Growing Teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#131313",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,183,125,0.18) 0%, rgba(255,183,125,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "200px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,183,125,0.10) 0%, rgba(255,183,125,0) 70%)",
          }}
        />

        {/* Top row: logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#ffb77d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#131313",
            }}
          >
            W
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Wazelo CRM
          </span>
          <div
            style={{
              marginLeft: "12px",
              padding: "4px 12px",
              borderRadius: "100px",
              border: "1px solid rgba(255,183,125,0.4)",
              fontSize: "13px",
              color: "#ffb77d",
              background: "rgba(255,183,125,0.08)",
            }}
          >
            WhatsApp CRM
          </div>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: "900",
              color: "#ffffff",
              lineHeight: "1.05",
              letterSpacing: "-0.03em",
              maxWidth: "700px",
            }}
          >
            Close Every{" "}
            <span style={{ color: "#ffb77d" }}>Deal</span>{" "}
            on WhatsApp
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.55)",
              maxWidth: "580px",
              lineHeight: "1.5",
              fontWeight: "400",
            }}
          >
            Shared inbox · Bulk campaigns · Automation · Analytics
          </div>
        </div>

        {/* Bottom row: domain + feature pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.35)",
              fontWeight: "500",
            }}
          >
            wazelo.in
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {["500+ Teams", "94% Delivery", "14-day Free Trial"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "8px 16px",
                  borderRadius: "100px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: "500",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
