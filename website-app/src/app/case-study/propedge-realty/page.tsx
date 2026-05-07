"use client";

import Image from "next/image";
import { useState } from "react";
import { useInView, useCounter, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Stat Counter Card ────────────────────────────────────────────────────────
function MetricCard({ value, suffix, label, active, color = "#ffb77d" }: { value: number; suffix: string; label: string; active: boolean; color?: string }) {
  const count = useCounter(value, 1800, active);
  return (
    <div style={{
      background: "#1c1b1b", border: "1px solid rgba(255,183,125,0.12)",
      borderTop: `2px solid ${color}`,
      borderRadius: 12, padding: "28px 24px", textAlign: "center",
      flex: "1 1 160px",
    }}>
      <div style={{ fontSize: "clamp(32px,3.5vw,48px)", fontWeight: 900, letterSpacing: "-0.04em", color, fontFamily: "'Inter', sans-serif" }}>
        {count.toLocaleString("en-IN")}{suffix}
      </div>
      <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", marginTop: 8, fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

// ─── Case Study Page ──────────────────────────────────────────────────────────
export default function CaseStudyPage() {
  const { mobile, tablet } = useBreakpoint();

  const heroView = useInView(0.1);
  const challengeView = useInView(0.15);
  const solutionView = useInView(0.15);
  const resultsView = useInView(0.1);
  const quoteView = useInView(0.2);
  const ctaView = useInView(0.2);

  const challenges = [
    {
      icon: "cancel",
      title: "Leads falling through the cracks",
      desc: "The sales team used 6 different personal WhatsApp numbers. Enquiries came in at all hours — and if the assigned agent was offline, the lead simply went cold. An internal audit found that nearly 38% of inbound leads were never followed up.",
    },
    {
      icon: "hourglass_empty",
      title: "Response times measured in hours",
      desc: "Average first response time was 4.2 hours. In real estate, where a prospect is likely talking to 3–4 competitors simultaneously, that delay was costing deals. Brokers had no shared visibility into what was already replied.",
    },
    {
      icon: "bar_chart_off",
      title: "Zero pipeline visibility",
      desc: "The sales manager had no way to see how many leads were active, which stage they were in, or which agent last contacted them. Every Monday review was a manual spreadsheet exercise that consumed 2–3 hours.",
    },
    {
      icon: "replay",
      title: "No follow-up consistency",
      desc: "Sending a follow-up message 3 days after a site visit depended entirely on individual agents remembering. There was no automation, no scheduling, and no accountability layer.",
    },
  ];

  const solutions = [
    {
      icon: "inbox",
      title: "Shared Team Inbox",
      desc: "All 14 sales agents connected to a single Wazelo CRM inbox. Every inbound WhatsApp message appears in one place — visible to the whole team, assigned to the right agent in seconds.",
    },
    {
      icon: "smart_toy",
      title: "Instant Auto-Reply Bot",
      desc: "A WhatsApp chatbot greets every lead within 5 seconds: shares project brochure, asks for preferred property type and budget, and books a callback slot — all before a human agent is involved.",
    },
    {
      icon: "label",
      title: "Contact Tagging & Pipeline Stages",
      desc: "Leads are tagged by project, location preference, and buyer intent. The pipeline view shows exactly how many prospects are at each stage: New → Contacted → Site Visit Scheduled → Negotiation → Closed.",
    },
    {
      icon: "campaign",
      title: "Broadcast Campaigns",
      desc: "Monthly project update campaigns sent to segmented lists in under 10 minutes. New launch announcements reach 2,400+ opted-in contacts with personalised messages — no manual copy-pasting.",
    },
    {
      icon: "schedule_send",
      title: "Automated Follow-Up Sequences",
      desc: "After every site visit, a 3-message follow-up sequence fires automatically: thank-you message on day 1, project comparison guide on day 3, and a soft close on day 7.",
    },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: mobile ? "120px 20px 80px" : "120px 48px 80px",
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(217,119,6,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 860, width: "100%", position: "relative", zIndex: 1 }}>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 40,
            opacity: heroView.inView ? 1 : 0, transition: "opacity 0.8s ease",
          }}>
            <a href="/" style={{ fontSize: 12, color: "rgba(219,194,176,0.4)", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}>Home</a>
            <span style={{ color: "rgba(219,194,176,0.2)", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 12, color: "rgba(219,194,176,0.4)", fontFamily: "'Inter', sans-serif" }}>Case Studies</span>
            <span style={{ color: "rgba(219,194,176,0.2)", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 12, color: "#ffb77d", fontFamily: "'Inter', sans-serif" }}>PropEdge Realty</span>
          </div>

          {/* Industry tag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
            borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)",
            marginBottom: 28,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.8s 0.05s ease, transform 0.8s 0.05s ease",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Real Estate · Mumbai, India</span>
          </div>

          <h1 style={{
            fontSize: mobile ? "clamp(32px,8vw,56px)" : "clamp(40px,5vw,72px)",
            fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08,
            color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 24,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>
            How PropEdge Realty<br />
            <span style={{ color: "#ffb77d" }}>3× their lead conversions</span><br />
            in 30 days
          </h1>

          <p style={{
            fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.65)", lineHeight: 1.8,
            maxWidth: 620, fontFamily: "'Inter', sans-serif", marginBottom: 48,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.2s ease, transform 0.9s 0.2s ease",
          }}>
            PropEdge Realty, a 14-person real estate brokerage in Mumbai, was losing deals to slower responses and zero pipeline visibility. Here's how Wazelo CRM transformed their WhatsApp sales process in one month.
          </p>

          {/* Key result strip */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.3s ease, transform 0.9s 0.3s ease",
          }}>
            {[
              { val: "↑ 340%", label: "Leads responded", color: "#ffb77d" },
              { val: "↓ 87%", label: "Response time", color: "#a3defe" },
              { val: "₹24L", label: "Revenue in month 1", color: "#86efac" },
              { val: "3×", label: "Conversion rate", color: "#f9a8d4" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#1c1b1b", border: "1px solid rgba(255,183,125,0.1)",
                borderRadius: 10, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em" }}>{s.val}</span>
                <span style={{ fontSize: 11, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Company snapshot ──────────────────────────────────────────────── */}
      <section style={{ background: "#131313", padding: mobile ? "48px 20px" : "56px 48px", borderTop: "1px solid rgba(255,183,125,0.06)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 1, background: "rgba(255,183,125,0.06)", borderRadius: 12, overflow: "hidden",
          }}>
            {[
              { label: "Industry", val: "Real Estate" },
              { label: "Team size", val: "14 agents" },
              { label: "Location", val: "Mumbai, India" },
              { label: "Time to results", val: "30 days" },
            ].map(item => (
              <div key={item.label} style={{ background: "#131313", padding: "24px 20px" }}>
                <div style={{ fontSize: 11, color: "rgba(219,194,176,0.4)", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Challenge ─────────────────────────────────────────────────── */}
      <section ref={challengeView.ref} style={{ background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            opacity: challengeView.inView ? 1 : 0, transform: challengeView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
            marginBottom: 48,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 14 }}>The Challenge</span>
            <h2 style={{ fontSize: mobile ? "clamp(26px,6vw,40px)" : "clamp(28px,3vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
              A thriving pipeline<br />hiding behind chaos
            </h2>
            <p style={{ fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", maxWidth: 640 }}>
              PropEdge Realty was generating strong inbound interest — Facebook ads, referrals, and IVR callbacks all funnelling into WhatsApp. But their internal processes couldn't keep up. Here's what we found in week one:
            </p>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16,
            opacity: challengeView.inView ? 1 : 0, transform: challengeView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.15s ease, transform 0.9s 0.15s ease",
          }}>
            {challenges.map((c) => (
              <div key={c.title} style={{
                background: "#1c1b1b", borderRadius: 12, padding: "24px",
                border: "1px solid rgba(255,183,125,0.08)",
                borderLeft: "3px solid rgba(239,68,68,0.5)",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: "rgba(239,68,68,0.7)", display: "block", marginBottom: 12 }}>{c.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Solution ──────────────────────────────────────────────────── */}
      <section ref={solutionView.ref} style={{ background: "#131313", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            opacity: solutionView.inView ? 1 : 0, transform: solutionView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
            marginBottom: 48,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 14 }}>The Solution</span>
            <h2 style={{ fontSize: mobile ? "clamp(26px,6vw,40px)" : "clamp(28px,3vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
              Five Wazelo CRM features,<br />deployed in 72 hours
            </h2>
            <p style={{ fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", maxWidth: 640 }}>
              Onboarding took less than 3 days. No new hardware, no API procurement delay — PropEdge connected their existing WhatsApp Business number and went live immediately.
            </p>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 0,
            border: "1px solid rgba(255,183,125,0.08)", borderRadius: 12, overflow: "hidden",
            opacity: solutionView.inView ? 1 : 0, transform: solutionView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.15s ease, transform 0.9s 0.15s ease",
          }}>
            {solutions.map((s, i) => (
              <div key={s.title} style={{
                display: "flex", gap: 20, padding: "24px 28px", alignItems: "flex-start",
                background: i % 2 === 0 ? "#1c1b1b" : "#191918",
                borderBottom: i < solutions.length - 1 ? "1px solid rgba(255,183,125,0.06)" : "none",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,183,125,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ffb77d" }}>{s.icon}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <section ref={resultsView.ref} style={{ background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            opacity: resultsView.inView ? 1 : 0, transform: resultsView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
            marginBottom: 48,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 14 }}>The Results</span>
            <h2 style={{ fontSize: mobile ? "clamp(26px,6vw,40px)" : "clamp(28px,3vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
              30 days. Measurable.<br />Undeniable.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", maxWidth: 640 }}>
              At the end of month one, PropEdge ran a full audit comparing their pre-Wazelo CRM metrics against post-implementation numbers. The results were consistent across every metric that matters.
            </p>
          </div>

          {/* Big metric cards */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 40,
            opacity: resultsView.inView ? 1 : 0, transform: resultsView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.15s ease, transform 0.9s 0.15s ease",
          }}>
            <MetricCard value={340} suffix="%" label="More leads responded to" active={resultsView.inView} color="#ffb77d" />
            <MetricCard value={87} suffix="%" label="Faster first response" active={resultsView.inView} color="#a3defe" />
            <MetricCard value={24} suffix="L" label="Revenue in month 1 (₹)" active={resultsView.inView} color="#86efac" />
            <MetricCard value={94} suffix="%" label="Lead response rate" active={resultsView.inView} color="#f9a8d4" />
          </div>

          {/* Before / After comparison */}
          <div style={{
            display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16,
            opacity: resultsView.inView ? 1 : 0, transition: "opacity 0.9s 0.25s ease",
          }}>
            <div style={{ background: "#1c1b1b", borderRadius: 12, padding: "28px", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(239,68,68,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>Before Wazelo CRM</div>
              {[
                ["Avg. first response time", "4.2 hours"],
                ["Lead response rate", "62%"],
                ["Weekly leads converted", "2–3"],
                ["Follow-up consistency", "Ad hoc"],
                ["Pipeline visibility", "None"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,183,125,0.06)" }}>
                  <span style={{ fontSize: 13, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(239,68,68,0.8)", fontFamily: "'Inter', sans-serif" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#1c1b1b", borderRadius: 12, padding: "28px", border: "1px solid rgba(134,239,172,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(134,239,172,0.8)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>After Wazelo CRM</div>
              {[
                ["Avg. first response time", "< 30 sec"],
                ["Lead response rate", "94%"],
                ["Weekly leads converted", "8–10"],
                ["Follow-up consistency", "Automated"],
                ["Pipeline visibility", "Real-time"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,183,125,0.06)" }}>
                  <span style={{ fontSize: 13, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(134,239,172,0.8)", fontFamily: "'Inter', sans-serif" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote ─────────────────────────────────────────────────────────── */}
      <section ref={quoteView.ref} style={{ background: "#131313", padding: mobile ? "80px 20px" : "100px 48px", borderTop: "1px solid rgba(255,183,125,0.06)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ width: 3, flexShrink: 0, background: "linear-gradient(to bottom,#ffb77d,transparent)", borderRadius: 4, alignSelf: "stretch" }} />
            <div style={{
              opacity: quoteView.inView ? 1 : 0, transform: quoteView.inView ? "translateX(0)" : "translateX(-20px)",
              transition: "opacity 0.9s ease, transform 0.9s ease",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "rgba(255,183,125,0.15)", display: "block", marginBottom: 20 }}>format_quote</span>
              <blockquote style={{
                fontStyle: "italic", fontWeight: 300,
                fontSize: mobile ? "clamp(18px,5vw,26px)" : "clamp(20px,2.2vw,32px)",
                lineHeight: 1.45, letterSpacing: "-0.02em",
                color: "rgba(229,226,225,0.88)", fontFamily: "'Inter', sans-serif", marginBottom: 32,
              }}>
                "We went from missing 40% of our leads to a 94% response rate in under 3 weeks. The shared inbox alone changed how our whole team works. Wazelo CRM is now non-negotiable for us."
              </blockquote>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2a2a2a", border: "2px solid rgba(255,183,125,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#a38c7c", fontSize: 24 }}>person</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 2 }}>Rajesh M.</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#ffb77d", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif" }}>Head of Sales, PropEdge Realty</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.08)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: mobile ? "clamp(26px,7vw,44px)" : "clamp(30px,3.5vw,52px)",
            fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16,
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            Write your own<br /><span style={{ color: "#ffb77d" }}>success story.</span>
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.7,
            fontFamily: "'Inter', sans-serif", marginBottom: 36,
            opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease",
          }}>
            PropEdge Realty did it in 30 days. Start your free trial — no credit card needed, no setup fees, no lock-in.
          </p>
          <div style={{
            display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s 0.2s ease, transform 0.8s 0.2s ease",
          }}>
            <a href={APP_REGISTER_URL} className="btn-primary" style={{
              padding: "16px 40px", borderRadius: 100, fontSize: 15, fontWeight: 800,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>Start Free Trial</a>
            <a href="/#pricing" className="btn-ghost" style={{
              padding: "16px 32px", borderRadius: 100, fontSize: 15, fontWeight: 600,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>See Pricing</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
