"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MessageSquare, Zap, Users, BarChart3, Shield, CheckCircle2 } from "lucide-react";

// ── Animated typing bubble ────────────────────────────────────────────────────
const conversations = [
  { from: "lead",  text: "Hi, interested in your premium plan" },
  { from: "agent", text: "Great! Let me walk you through it 🚀" },
  { from: "lead",  text: "What's included in the Growth plan?" },
  { from: "agent", text: "25k msgs, automations + priority support" },
  { from: "lead",  text: "Perfect. How do I get started?" },
  { from: "agent", text: "Click the link below — 14 day free trial!" },
];

function ChatBubble({ msg, visible, delay }: { msg: typeof conversations[0]; visible: boolean; delay: number }) {
  const isAgent = msg.from === "agent";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAgent ? "flex-end" : "flex-start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity 0.4s ${delay}ms ease, transform 0.4s ${delay}ms ease`,
      }}
    >
      {!isAgent && (
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,183,125,0.15)", border: "1px solid rgba(255,183,125,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: "#ffb77d" }}>L</span>
        </div>
      )}
      <div style={{
        maxWidth: "72%",
        padding: "8px 13px",
        borderRadius: isAgent ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
        background: isAgent ? "rgba(217,119,6,0.18)" : "rgba(255,255,255,0.07)",
        border: isAgent ? "1px solid rgba(217,119,6,0.25)" : "1px solid rgba(255,255,255,0.08)",
        fontSize: 12,
        lineHeight: 1.5,
        color: isAgent ? "#ffcc99" : "rgba(232,234,237,0.85)",
        letterSpacing: "0.01em",
      }}>
        {msg.text}
      </div>
      {isAgent && (
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: "#1a1d27", fontWeight: 700 }}>W</span>
        </div>
      )}
    </div>
  );
}

function LiveChatMockup() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= conversations.length) return;
    const t = setTimeout(() => setVisibleCount(v => v + 1), 900 + visibleCount * 600);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      overflow: "hidden",
      backdropFilter: "blur(12px)",
    }}>
      {/* Chat header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare style={{ width: 14, height: 14, color: "#1a1d27" }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,234,237,0.9)" }}>Nexus Capital — Rahul</div>
          <div style={{ fontSize: 10, color: "#d97706", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
            Online · Wazelo CRM
          </div>
        </div>
      </div>
      {/* Messages */}
      <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
        {conversations.map((msg, i) => (
          <ChatBubble key={i} msg={msg} visible={i < visibleCount} delay={0} />
        ))}
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: "10px 14px",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ color: "#d97706", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(232,234,237,0.95)", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10, color: "rgba(156,163,180,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Feature row ───────────────────────────────────────────────────────────────
function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#d97706" }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, color: "rgba(156,163,180,0.85)", lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

// ── Brand panel (left side) ───────────────────────────────────────────────────
function BrandPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{
      position: "relative", flex: 1, minHeight: "100vh", width: "100%",
      background: "linear-gradient(145deg, #0a0c12 0%, #0f1117 40%, #131620 100%)",
      display: "flex", flexDirection: "column",
      padding: "48px 52px",
      overflow: "hidden",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "-10%", width: "50%", height: "40%", background: "radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Grid texture */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{
        position: "relative", zIndex: 10,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-12px)",
        transition: "all 0.6s ease",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare style={{ width: 18, height: 18, color: "#1a1d27" }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color: "rgba(232,234,237,0.95)", letterSpacing: "-0.02em" }}>
          Wazelo <span style={{ color: "#d97706" }}>CRM</span>
        </span>
      </div>

      {/* Main headline */}
      <div style={{
        position: "relative", zIndex: 10, flex: 1,
        display: "flex", flexDirection: "column", justifyContent: "center",
        gap: 32, paddingTop: 32,
      }}>
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.15s ease",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#d97706", marginBottom: 14 }}>
            WhatsApp CRM Platform
          </div>
          <h2 style={{ fontSize: "clamp(28px,2.8vw,38px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", color: "rgba(232,234,237,0.95)", margin: 0 }}>
            Close every deal<br />
            <span style={{ color: "#d97706" }}>on WhatsApp.</span>
          </h2>
          <p style={{ marginTop: 14, fontSize: 14, color: "rgba(156,163,180,0.7)", lineHeight: 1.65, maxWidth: 340 }}>
            Shared inbox, campaigns, automation — everything your team needs to convert leads at scale.
          </p>
        </div>

        {/* Live chat mockup */}
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.7s 0.3s ease",
        }}>
          <LiveChatMockup />
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.45s ease",
        }}>
          <StatPill icon={<Users style={{ width: 14, height: 14 }} />} value="500+" label="Active teams" />
          <StatPill icon={<BarChart3 style={{ width: 14, height: 14 }} />} value="94%" label="Delivery rate" />
          <StatPill icon={<Zap style={{ width: 14, height: 14 }} />} value="4.8 min" label="Avg response" />
          <StatPill icon={<Shield style={{ width: 14, height: 14 }} />} value="99.9%" label="Uptime SLA" />
        </div>

        {/* Features */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.55s ease",
        }}>
          <FeatureRow icon={<CheckCircle2 style={{ width: 13, height: 13 }} />} text="Shared inbox with role-based access" />
          <FeatureRow icon={<CheckCircle2 style={{ width: 13, height: 13 }} />} text="Bulk campaigns with real-time tracking" />
          <FeatureRow icon={<CheckCircle2 style={{ width: 13, height: 13 }} />} text="No-code automation & chatbot builder" />
        </div>
      </div>

      {/* Bottom trust line */}
      <div style={{
        position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20,
        opacity: mounted ? 1 : 0, transition: "all 0.7s 0.7s ease",
      }}>
        <p style={{ fontSize: 11, color: "rgba(156,163,180,0.4)", letterSpacing: "0.05em" }}>
          Trusted by 500+ businesses · Meta Business Partner · 14-day free trial
        </p>
      </div>
    </div>
  );
}

// ── Auth Layout ───────────────────────────────────────────────────────────────
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left: Brand panel — hidden on mobile */}
      <div className="hidden lg:flex" style={{ flex: "0 0 50%" }}>
        <BrandPanel />
      </div>

      {/* Right: Form panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "var(--surface)",
        position: "relative",
        overflowY: "auto",
      }}>
        {/* Subtle top glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "80%", height: 300,
          background: "radial-gradient(ellipse at top, rgba(217,119,6,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        

       

        {/* Mobile-only logo */}
        <div className="flex lg:hidden" style={{
          alignItems: "center", gap: 8, marginBottom: 32,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare style={{ width: 14, height: 14, color: "#1a1d27" }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--on-surface)", letterSpacing: "-0.02em" }}>
            Wazelo <span style={{ color: "var(--primary)" }}>CRM</span>
          </span>
        </div>

        {/* Form content */}
        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
