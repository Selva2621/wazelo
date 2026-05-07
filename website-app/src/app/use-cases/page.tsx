"use client";

import { useState, useEffect } from "react";
import { useInView, useCounter, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";

// ─── CSS Keyframes ────────────────────────────────────────────────────────────
const STYLES = `
@keyframes usecaseFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes usecasePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes usecasePing {
  0% { transform: scale(1); opacity: 0.7; }
  80%, 100% { transform: scale(1.9); opacity: 0; }
}
@keyframes usecaseTyping {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}
@keyframes usecaseSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes usecaseCheckDraw {
  from { stroke-dashoffset: 20; }
  to { stroke-dashoffset: 0; }
}
@keyframes marqueeScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

// ─── ScrollProgress ───────────────────────────────────────────────────────────
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const h = () => {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      setPct(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, height: 3, zIndex: 200,
      width: `${pct}%`, background: "linear-gradient(90deg,#d97707,#ffb77d)",
      transition: "width 0.1s linear", pointerEvents: "none",
    }} />
  );
}

import SiteNavbar from "@/components/Navbar";

// ─── Industry Mockups ─────────────────────────────────────────────────────────

function EcommerceMockup() {
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      {/* Chrome bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,183,125,0.08)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#25D366,#128C7E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14 }}>🛒</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>Ananya Sharma</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)" }}>online</div>
        </div>
      </div>
      {/* Bot message */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ alignSelf: "flex-start", maxWidth: "82%" }}>
          <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,183,125,0.1)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "rgba(219,194,176,0.5)", marginBottom: 4 }}>Wazelo Bot · just now</div>
            <div style={{ fontSize: 12, color: "#e5e2e1", lineHeight: 1.6 }}>
              Hey Ananya! 👋 You left <span style={{ color: "#ffb77d", fontWeight: 700 }}>3 items</span> in your cart worth ₹2,499.
            </div>
          </div>
        </div>
        {/* Second message with floating */}
        <div style={{ alignSelf: "flex-start", maxWidth: "90%", animation: "usecaseFloat 3s ease-in-out infinite", animationDelay: "0.5s" }}>
          <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,183,125,0.12)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px" }}>
            <div style={{ fontSize: 12, color: "#e5e2e1", lineHeight: 1.6, marginBottom: 10 }}>
              Complete your purchase now and get <span style={{ color: "#22c55e", fontWeight: 700 }}>10% off</span> — offer expires in 2 hrs!
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ padding: "6px 14px", borderRadius: 100, background: "#25D366", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Shop Now →</span>
              <span style={{ padding: "6px 14px", borderRadius: 100, background: "rgba(255,183,125,0.1)", border: "1px solid rgba(255,183,125,0.2)", color: "#ffb77d", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View Cart</span>
            </div>
          </div>
        </div>
        {/* Delivery stats row */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[["2.1k", "Sent"], ["1.8k", "Read"], ["312", "Clicked"]].map(([n, l]) => (
            <div key={l} style={{ flex: 1, background: "#131313", border: "1px solid rgba(255,183,125,0.07)", borderRadius: 10, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#ffb77d", letterSpacing: "-0.03em" }}>{n}</div>
              <div style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RealEstateMockup() {
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* Property card */}
      <div style={{ background: "#131313", border: "1px solid rgba(255,183,125,0.1)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        {/* Thumbnail placeholder */}
        <div style={{ height: 90, background: "linear-gradient(135deg,#1a1a1a,#222)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,183,125,0.03) 10px,rgba(255,183,125,0.03) 11px)" }} />
          <span style={{ fontSize: 28, opacity: 0.6 }}>🏢</span>
          <div style={{ position: "absolute", top: 10, right: 10, background: "#ffb77d", color: "#131313", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800 }}>NEW</div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>Prestige Lakefront</div>
              <div style={{ fontSize: 11, color: "rgba(219,194,176,0.45)", marginTop: 2 }}>Koramangala, Bengaluru</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#ffb77d" }}>₹1.2Cr</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["3 BHK", "1,850 sqft", "Ready to Move"].map(tag => (
              <span key={tag} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.15)", color: "rgba(219,194,176,0.65)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Site visit reminder */}
      <div style={{ background: "#131313", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, animation: "usecaseFloat 3.5s ease-in-out infinite" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16 }}>📅</span>
          </div>
          <div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", animation: "usecasePing 1.5s ease-in-out infinite" }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>Site Visit Confirmed</div>
          <div style={{ fontSize: 11, color: "rgba(219,194,176,0.5)", marginTop: 2 }}>Rahul Gupta · Tomorrow, 11:00 AM</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "4px 8px", borderRadius: 6 }}>✓ Sent</div>
      </div>
    </div>
  );
}

function HealthcareMockup() {
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* Appointment card */}
      <div style={{ background: "#131313", border: "1px solid rgba(255,183,125,0.1)", borderRadius: 14, padding: "16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🩺</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>Dr. Priya Menon</div>
            <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)" }}>General Physician · Apollo Clinic</div>
          </div>
          <div style={{ marginLeft: "auto", background: "rgba(255,183,125,0.1)", border: "1px solid rgba(255,183,125,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#ffb77d" }}>Tomorrow</div>
        </div>
        <div style={{ background: "#0e0e0e", borderRadius: 10, padding: "10px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e2e1", letterSpacing: "-0.04em" }}>10:30</div>
            <div style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>TIME</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,183,125,0.08)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e2e1", letterSpacing: "-0.04em" }}>OPD 3</div>
            <div style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>ROOM</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,183,125,0.08)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#3b82f6", letterSpacing: "-0.04em" }}>Riya</div>
            <div style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>PATIENT</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "9px", borderRadius: 100, background: "#22c55e", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Confirm</button>
          <button style={{ flex: 1, padding: "9px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,183,125,0.2)", color: "#ffb77d", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Reschedule</button>
        </div>
      </div>
      {/* Reminder sent badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#131313", borderRadius: 10, border: "1px solid rgba(255,183,125,0.07)", animation: "usecaseFloat 4s ease-in-out infinite", animationDelay: "1s" }}>
        <span style={{ fontSize: 16 }}>💊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e5e2e1" }}>Prescription ready for pickup</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>WhatsApp reminder sent · 2m ago</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb77d", animation: "usecasePulse 2s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function EducationMockup() {
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* Broadcast panel header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>Exam Schedule Broadcast</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>Sent to 1,240 students · 5 mins ago</div>
        </div>
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#22c55e" }}>Live</div>
      </div>
      {/* Message preview */}
      <div style={{ background: "#131313", border: "1px solid rgba(255,183,125,0.1)", borderRadius: 12, padding: "14px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(219,194,176,0.5)", marginBottom: 8 }}>📢 Message Preview</div>
        <div style={{ fontSize: 12, color: "#e5e2e1", lineHeight: 1.7 }}>
          Dear students,<br />
          Your <span style={{ color: "#ffb77d", fontWeight: 700 }}>Term 2 exam schedule</span> is now available. Physics: June 12 | Math: June 14 | Chemistry: June 16.<br />
          <span style={{ color: "rgba(219,194,176,0.5)" }}>Download hall ticket from the link below. 📎</span>
        </div>
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#0e0e0e", borderRadius: 8, fontSize: 11, color: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔗</span> Download Hall Ticket
        </div>
      </div>
      {/* Delivery stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[["1,240", "Delivered", "#22c55e"], ["1,087", "Read", "#3b82f6"], ["203", "Replied", "#ffb77d"]].map(([n, l, c], i) => (
          <div key={l} style={{ background: "#131313", border: "1px solid rgba(255,183,125,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center", animation: "usecaseFloat 3s ease-in-out infinite", animationDelay: `${i * 0.3}s` }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: c as string, letterSpacing: "-0.04em" }}>{n}</div>
            <div style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TravelMockup() {
  const steps = [
    { icon: "✈️", label: "Flight", detail: "AI-345 · BOM→DXB", time: "08:30", done: true },
    { icon: "🏨", label: "Hotel", detail: "JW Marriott · Marina", time: "Check-in 14:00", done: true },
    { icon: "🚤", label: "Dhow Cruise", detail: "Dubai Creek", time: "19:00", done: false },
    { icon: "🏄", label: "Desert Safari", detail: "Pickup from hotel", time: "15:00 Tomorrow", done: false },
  ];
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>Dubai Trip · Jun 12–16</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>Itinerary sent via WhatsApp</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#ffb77d", background: "rgba(255,183,125,0.1)", border: "1px solid rgba(255,183,125,0.2)", padding: "4px 10px", borderRadius: 8 }}>4 Days</div>
      </div>
      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < steps.length - 1 ? 0 : 0 }}>
            {/* Timeline line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: s.done ? "rgba(34,197,94,0.15)" : "rgba(255,183,125,0.1)",
                border: s.done ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,183,125,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
                animation: !s.done ? "usecaseFloat 3s ease-in-out infinite" : "none",
                animationDelay: `${i * 0.4}s`,
              }}>{s.icon}</div>
              {i < steps.length - 1 && <div style={{ width: 1, height: 20, background: s.done ? "rgba(34,197,94,0.2)" : "rgba(255,183,125,0.08)", margin: "3px 0" }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#22c55e" : "#e5e2e1" }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(219,194,176,0.45)", marginTop: 2 }}>{s.detail}</div>
                </div>
                <div style={{ fontSize: 10, color: s.done ? "#22c55e" : "rgba(219,194,176,0.4)", textAlign: "right", flexShrink: 0 }}>{s.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Upsell */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: "#131313", border: "1px solid rgba(255,183,125,0.12)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, animation: "usecaseFloat 4s ease-in-out infinite", animationDelay: "0.8s" }}>
        <span style={{ fontSize: 18 }}>🌟</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ffb77d" }}>Upgrade to Business Class</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)", marginTop: 1 }}>+₹8,500 · Tap to add</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb77d", animation: "usecasePulse 2s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function FinanceMockup() {
  const steps = [
    { label: "PAN Verification", done: true },
    { label: "Aadhaar Linking", done: true },
    { label: "Bank Statement Upload", done: false, active: true },
    { label: "Video KYC", done: false, active: false },
  ];
  return (
    <div style={{ background: "#0e0e0e", borderRadius: 20, padding: "20px", fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* KYC header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>KYC Completion</div>
          <div style={{ fontSize: 10, color: "rgba(219,194,176,0.4)", marginTop: 2 }}>Home Loan Application · #HL-2024-8821</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#ffb77d" }}>2 / 4</div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: "rgba(255,183,125,0.1)", borderRadius: 100, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: "50%", background: "linear-gradient(90deg,#d97707,#ffb77d)", borderRadius: 100, transition: "width 1.5s ease" }} />
      </div>
      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px",
            background: s.active ? "rgba(255,183,125,0.06)" : "#131313",
            border: s.active ? "1px solid rgba(255,183,125,0.2)" : "1px solid rgba(255,183,125,0.05)",
            borderRadius: 10,
            animation: s.active ? "usecaseFloat 3s ease-in-out infinite" : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: s.done ? "rgba(34,197,94,0.15)" : s.active ? "rgba(255,183,125,0.15)" : "rgba(255,255,255,0.04)",
              border: s.done ? "1.5px solid #22c55e" : s.active ? "1.5px solid #ffb77d" : "1.5px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}>
              {s.done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray: 20, strokeDashoffset: 0, animation: "usecaseCheckDraw 0.4s ease forwards" }} />
                </svg>
              ) : s.active ? (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb77d", animation: "usecasePulse 1.5s ease-in-out infinite" }} />
              ) : (
                <span style={{ fontSize: 9, color: "rgba(219,194,176,0.3)", fontWeight: 700 }}>{i + 1}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: s.active ? 700 : 500, color: s.done ? "#22c55e" : s.active ? "#ffb77d" : "rgba(219,194,176,0.4)" }}>{s.label}</div>
            </div>
            {s.active && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ffb77d", background: "rgba(255,183,125,0.1)", padding: "3px 8px", borderRadius: 6 }}>Pending</div>
            )}
            {s.done && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 8px", borderRadius: 6 }}>Done</div>
            )}
          </div>
        ))}
      </div>
      {/* WhatsApp nudge */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: "#131313", border: "1px solid rgba(37,211,102,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <div style={{ fontSize: 11, color: "rgba(219,194,176,0.65)" }}>
          <span style={{ color: "#25D366", fontWeight: 700 }}>WhatsApp reminder</span> sent to upload bank statement
        </div>
      </div>
    </div>
  );
}

// ─── Use Case Section ─────────────────────────────────────────────────────────
function UseCaseSection({
  id, tag, title, desc, bullets, mockup, reverse,
}: {
  id: string; tag: string; title: string; desc: string; bullets: string[]; mockup: React.ReactNode; reverse?: boolean;
}) {
  const { mobile } = useBreakpoint();
  const view = useInView(0.15);

  return (
    <section id={id} ref={view.ref} style={{
      padding: mobile ? "80px 20px" : "100px 48px",
      background: "var(--bg)",
      borderBottom: "1px solid rgba(255,183,125,0.05)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
        gap: mobile ? 40 : 80,
        direction: (!mobile && reverse) ? "rtl" : "ltr",
      }}>
        {/* Text */}
        <div style={{
          direction: "ltr",
          opacity: view.inView ? 1 : 0,
          transform: view.inView ? "translateX(0)" : (reverse ? "translateX(32px)" : "translateX(-32px)"),
          transition: "opacity 0.9s ease, transform 0.9s ease",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 14 }}>{tag}</span>
          <h2 style={{ fontSize: "clamp(26px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 18 }}>{title}</h2>
          <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 28 }}>{desc}</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
            {bullets.map((b, bi) => (
              <li key={b} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                opacity: view.inView ? 1 : 0,
                transform: view.inView ? "translateX(0)" : "translateX(-16px)",
                transition: `opacity 0.7s ${0.2 + bi * 0.07}s ease, transform 0.7s ${0.2 + bi * 0.07}s ease`,
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,183,125,0.15)", border: "1px solid rgba(255,183,125,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "block" }} />
                </span>
                <span style={{ fontSize: 14, color: "rgba(219,194,176,0.75)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>{b}</span>
              </li>
            ))}
          </ul>
          <a href={APP_REGISTER_URL} className="btn-primary" style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 100,
            fontSize: 13, fontWeight: 800, textDecoration: "none", fontFamily: "'Inter', sans-serif",
            alignSelf: "flex-start",
            opacity: view.inView ? 1 : 0,
            transition: "opacity 0.7s 0.5s ease",
          }}>Try it free</a>
        </div>

        {/* Mockup visual */}
        <div style={{
          direction: "ltr",
          opacity: view.inView ? 1 : 0,
          transform: view.inView ? "scale(1) rotate(0deg)" : "scale(0.92) rotate(1deg)",
          transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s cubic-bezier(0.34,1.56,0.64,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid rgba(255,183,125,0.1)",
            borderRadius: 24, padding: "24px",
            boxShadow: "0 0 80px rgba(217,119,6,0.08), 0 32px 64px rgba(0,0,0,0.4)",
            width: "100%",
          }}>
            {mockup}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Industries data ──────────────────────────────────────────────────────────
const industries = [
  {
    id: "ecommerce",
    tag: "E-commerce",
    title: "Recover carts. Drive repeat orders.",
    desc: "Turn WhatsApp into your most powerful sales channel. Reach customers at every stage of their buying journey with automated, personalised messages.",
    bullets: [
      "Abandoned cart recovery with one-click checkout links",
      "Order confirmation and shipping updates on WhatsApp",
      "Post-delivery review requests and upsell campaigns",
      "Customer support with shared team inbox",
    ],
    mockup: <EcommerceMockup />,
  },
  {
    id: "realestate",
    tag: "Real Estate",
    title: "Close more deals. Faster.",
    desc: "Real estate runs on relationships. Wazelo CRM helps you follow up instantly, send property details, and stay top of mind with every prospect.",
    bullets: [
      "Instant lead response from WhatsApp ads and portals",
      "Property brochures and virtual tour links on demand",
      "Site visit reminders and follow-up automation",
      "Deal pipeline tracking with contact tags",
    ],
    mockup: <RealEstateMockup />,
  },
  {
    id: "healthcare",
    tag: "Healthcare",
    title: "Reduce no-shows. Improve care.",
    desc: "Automate appointment reminders, prescription alerts, and health tips — all through a channel your patients already use every day.",
    bullets: [
      "Appointment booking confirmations and reminders",
      "Prescription ready and refill notifications",
      "Post-visit care instructions and follow-ups",
      "Lab report delivery via secure WhatsApp message",
    ],
    mockup: <HealthcareMockup />,
  },
  {
    id: "education",
    tag: "Education",
    title: "Engage students. Enrol faster.",
    desc: "From admission inquiries to fee payment nudges, Wazelo CRM keeps your institution connected with students and parents throughout the year.",
    bullets: [
      "Instant response to admission inquiry forms",
      "Fee due reminders and payment confirmation",
      "Exam schedule and result notifications",
      "Bulk broadcast for events and announcements",
    ],
    mockup: <EducationMockup />,
  },
  {
    id: "travel",
    tag: "Travel & Hospitality",
    title: "Deliver experiences before they arrive.",
    desc: "Set the tone before check-in. Send itineraries, upsell add-ons, and handle customer queries through a single WhatsApp-first inbox.",
    bullets: [
      "Booking confirmation with downloadable itinerary",
      "Pre-arrival upsell for room upgrades and excursions",
      "Real-time flight or tour status updates",
      "Post-trip review requests and loyalty offers",
    ],
    mockup: <TravelMockup />,
  },
  {
    id: "finance",
    tag: "Finance & Insurance",
    title: "Nurture leads. Retain clients.",
    desc: "Compliance-aware, personalised communication at scale. Follow up on policy renewals, KYC steps, and loan applications without missing a beat.",
    bullets: [
      "Policy renewal reminders and premium due alerts",
      "KYC document collection via WhatsApp",
      "Loan application status updates",
      "Investment portfolio alerts and SIP reminders",
    ],
    mockup: <FinanceMockup />,
  },
];

// ─── Why WhatsApp stats with animated counters ────────────────────────────────
function WhyStats({ active }: { active: boolean }) {
  const c1 = useCounter(98, 1400, active);
  const c2 = useCounter(5, 1000, active);
  const c3 = useCounter(25, 1600, active);
  const { mobile } = useBreakpoint();

  const stats = [
    { value: `${c1}%`, label: "Average open rate on WhatsApp" },
    { value: `${c2}×`, label: "Higher reply rate vs email" },
    { value: `${(c3 / 10).toFixed(1)}B+`, label: "Active WhatsApp users globally" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
      gap: 20,
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          background: "var(--surface)", border: "1px solid rgba(255,183,125,0.12)",
          borderRadius: 16, padding: "40px 32px",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${0.1 + i * 0.1}s ease, transform 0.7s ${0.1 + i * 0.1}s ease`,
        }}>
          <div style={{ fontSize: "clamp(44px,5vw,64px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#ffb77d", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>{s.value}</div>
          <div style={{ fontSize: 14, color: "rgba(219,194,176,0.6)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Use Cases Page ───────────────────────────────────────────────────────────
export default function UseCasesPage() {
  const { mobile } = useBreakpoint();
  const heroView = useInView(0.1);
  const whyView = useInView(0.15);
  const ctaView = useInView(0.2);
  const [activeIndustry, setActiveIndustry] = useState("ecommerce");

  // Update active pill as user scrolls
  useEffect(() => {
    const handler = () => {
      for (const ind of industries) {
        const el = document.getElementById(ind.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom > 120) {
          setActiveIndustry(ind.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToIndustry = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

      <ScrollProgress />
      <SiteNavbar activePage="Use Cases" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: mobile ? "120px 20px 80px" : "120px 48px 80px",
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(217,119,6,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", maxWidth: 860, position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
            borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)",
            marginBottom: 32,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block", animation: "usecasePulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ffb77d", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Use Cases</span>
          </div>

          <h1 style={{
            fontSize: "clamp(38px,5.5vw,80px)", fontWeight: 900, letterSpacing: "-0.04em",
            lineHeight: 1.08, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 24,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>
            One platform.<br />
            <span style={{ color: "#ffb77d" }}>Every industry.</span>
          </h1>

          <p style={{
            fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.7)", lineHeight: 1.8,
            maxWidth: 580, margin: "0 auto 48px", fontFamily: "'Inter', sans-serif",
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.2s ease, transform 0.9s 0.2s ease",
          }}>
            From e-commerce to healthcare, Wazelo CRM powers WhatsApp relationships for businesses of every shape and size.
          </p>

          {/* Industry quick-links */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
            opacity: heroView.inView ? 1 : 0, transition: "opacity 0.9s 0.3s ease",
          }}>
            {industries.map((ind, i) => (
              <button key={ind.id} onClick={() => scrollToIndustry(ind.id)} style={{
                padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)",
                color: "#dbc2b0", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s ease",
                opacity: heroView.inView ? 1 : 0,
                transform: heroView.inView ? "translateY(0)" : "translateY(12px)",
                transitionDelay: `${0.35 + i * 0.05}s`,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,183,125,0.18)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,183,125,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#dbc2b0"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >{ind.tag}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee ticker ────────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface-low)", borderTop: "1px solid rgba(255,183,125,0.06)", borderBottom: "1px solid rgba(255,183,125,0.06)", padding: "14px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 40, whiteSpace: "nowrap", animation: "marqueeScroll 20s linear infinite" }}>
          {[...industries, ...industries].map((ind, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(219,194,176,0.35)", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,183,125,0.4)", display: "inline-block" }} />
              {ind.tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Sticky Jump Nav ───────────────────────────────────────────────── */}
      {!mobile && (
        <div style={{
          position: "sticky", top: 64, zIndex: 40,
          background: "rgba(13,13,13,0.95)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,183,125,0.06)",
          padding: "12px 48px",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {industries.map(ind => (
              <button key={ind.id} onClick={() => scrollToIndustry(ind.id)} style={{
                padding: "7px 16px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                background: activeIndustry === ind.id ? "rgba(255,183,125,0.18)" : "transparent",
                border: activeIndustry === ind.id ? "1px solid rgba(255,183,125,0.4)" : "1px solid transparent",
                color: activeIndustry === ind.id ? "#ffb77d" : "rgba(219,194,176,0.5)",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.25s ease",
              }}>{ind.tag}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Industry Sections ─────────────────────────────────────────────── */}
      {industries.map((ind, i) => (
        <UseCaseSection key={ind.id} reverse={i % 2 === 1} {...ind} />
      ))}

      {/* ── Why WhatsApp ──────────────────────────────────────────────────── */}
      <section ref={whyView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 12 }}>The numbers</span>
          <h2 style={{
            fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 56,
            opacity: whyView.inView ? 1 : 0, transform: whyView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            Why WhatsApp is the<br />
            <span style={{ color: "#ffb77d" }}>highest ROI channel</span>
          </h2>
          <WhyStats active={whyView.inView} />
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.08)",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16,
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            Start your WhatsApp CRM<br />journey today.
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.7,
            fontFamily: "'Inter', sans-serif", marginBottom: 36,
            opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease",
          }}>
            Free trial. No credit card required. Setup in under 5 minutes.
          </p>
          <a href={APP_REGISTER_URL} className="btn-primary" style={{
            padding: "16px 40px", borderRadius: 100, fontSize: 15, fontWeight: 800,
            textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s 0.2s ease, transform 0.8s 0.2s ease",
          }}>Get started for free</a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
