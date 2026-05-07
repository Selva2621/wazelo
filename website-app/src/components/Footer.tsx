"use client";

import Image from "next/image";
import Link from "next/link";
import { useBreakpoint } from "@/lib/wazelo";

const cols = [
  { title: "Product", links: [["Shared Inbox", "/features/shared-inbox"], ["Bulk Campaigns", "/features/campaigns"], ["Automation", "/features/automation"], ["Chatbot Builder", "/features/chatbot"], ["Contacts CRM", "/features/contacts"], ["Analytics", "/features/analytics"], ["Deals Pipeline", "/features/deals"], ["Sequences", "/features/sequences"]] },
  { title: "Resources", links: [["Documentation", "/docs"], ["API Reference", "/api-reference"], ["Use Cases", "/use-cases"], ["Case Study", "/case-study/propedge-realty"], ["Security", "/security"]] },
  { title: "Company", links: [["About Us", "/about"], ["Contact", "/contact"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
];

export default function Footer() {
  const { mobile, tablet } = useBreakpoint();

  return (
    <footer style={{ background: "#0e0e0e", borderTop: "1px solid rgba(255,183,125,0.1)", paddingTop: mobile ? 56 : 80, paddingBottom: 40, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 1, background: "linear-gradient(to right,transparent,rgba(255,183,125,0.35),transparent)" }} />
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: mobile ? "0 20px" : "0 48px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : tablet ? "1fr 1fr 1fr" : "2fr 1fr 1fr 1fr",
          gap: mobile ? 32 : 48, marginBottom: 48,
        }}>
          <div style={{ gridColumn: (mobile || tablet) ? "1 / -1" : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Image src="/logo/logo.jpeg" alt="Wazelo CRM" width={32} height={32} style={{ height: 32, width: 32, objectFit: "contain", mixBlendMode: "screen" }} />
              <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>
                Wazelo <span style={{ color: "#ffb77d" }}>CRM</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(219,194,176,0.45)", lineHeight: 1.75, maxWidth: 280, fontFamily: "'Inter', sans-serif" }}>
              Shared inbox, campaigns, automation, deals pipeline, multi-channel messaging, and more — all in one platform.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#e5e2e1", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {col.links.map(([label, href]) => (
                  <li key={label} style={{ marginBottom: 10 }}>
                    <Link href={href} style={{ fontSize: 13, color: "rgba(163,140,124,0.7)", textDecoration: "none", transition: "color 0.2s", fontFamily: "'Inter', sans-serif" }}
                      onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = "#e5e2e1")}
                      onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = "rgba(163,140,124,0.7)")}
                    >{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 24 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'Inter', sans-serif" }}>© 2025 Wazelo CRM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
