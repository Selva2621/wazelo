import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist. Explore Wazelo CRM — WhatsApp CRM for Indian businesses.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, background: "var(--c-surface)", fontFamily: "sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
            textAlign: "center",
            color: "var(--c-on-surface)",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", marginBottom: "48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--c-primary-container)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "var(--c-surface)",
                }}
              >
                W
              </div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--c-on-surface)" }}>
                Wazelo CRM
              </span>
            </div>
          </Link>

          {/* 404 */}
          <div
            style={{
              fontSize: "120px",
              fontWeight: "900",
              lineHeight: "1",
              color: "var(--c-primary-container)",
              marginBottom: "16px",
              letterSpacing: "-0.05em",
            }}
          >
            404
          </div>

          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              marginBottom: "12px",
              color: "var(--c-on-surface)",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--c-on-surface-variant)",
              maxWidth: "440px",
              lineHeight: "1.6",
              marginBottom: "40px",
            }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Head back to explore Wazelo CRM.
          </p>

          {/* Links */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
            <Link
              href="/"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                background: "var(--c-primary-container)",
                color: "var(--c-surface)",
                fontWeight: "600",
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Back to Home
            </Link>
            <Link
              href="/features/shared-inbox"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid rgb(var(--fx-ink) / 0.15)",
                color: "var(--c-on-surface)",
                fontWeight: "500",
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Shared Inbox
            </Link>
            <Link
              href="/features/campaigns"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid rgb(var(--fx-ink) / 0.15)",
                color: "var(--c-on-surface)",
                fontWeight: "500",
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Campaigns
            </Link>
            <Link
              href="/contact"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid rgb(var(--fx-ink) / 0.15)",
                color: "var(--c-on-surface)",
                fontWeight: "500",
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
