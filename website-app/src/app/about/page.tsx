"use client";

import Image from "next/image";
import { useState } from "react";
import { useInView, useCounter, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Stat Counter Card ────────────────────────────────────────────────────────
function StatCard({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useCounter(value, 1800, active);
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(255,183,125,0.12)",
      borderRadius: 16, padding: "32px 24px", textAlign: "center",
      flex: "1 1 180px",
    }}>
      <div style={{ fontSize: "clamp(36px,4vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#ffb77d", fontFamily: "'Inter', sans-serif" }}>
        {count.toLocaleString("en-IN")}{suffix}
      </div>
      <div style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", marginTop: 8, fontFamily: "'Inter', sans-serif" }}>{label}</div>
    </div>
  );
}

// ─── Core Value Card ──────────────────────────────────────────────────────────
function ValueCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-card" style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "28px 24px",
    }}>
      <span className="material-symbols-outlined card-icon" style={{ fontSize: 28, color: "#ffb77d", marginBottom: 16, display: "block" }}>{icon}</span>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#e5e2e1", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>{desc}</p>
    </div>
  );
}

// ─── About Page ───────────────────────────────────────────────────────────────
export default function AboutPage() {
  const { mobile, tablet } = useBreakpoint();

  const heroView = useInView(0.1);
  const missionView = useInView(0.2);
  const storyView = useInView(0.15);
  const valuesView = useInView(0.1);
  const statsView = useInView(0.2);
  const ctaView = useInView(0.2);

  const values = [
    { icon: "bolt", title: "Speed", desc: "We move fast. Every millisecond of latency is a problem worth solving." },
    { icon: "lock", title: "Privacy", desc: "Your conversations are yours. We never sell data, never mine messages." },
    { icon: "layers", title: "Simplicity", desc: "Powerful doesn't have to mean complicated. We design for clarity first." },
    { icon: "trending_up", title: "Scale", desc: "Built to handle millions of messages without breaking a sweat." },
  ];

  return (
    <>
      {/* Google Material Icons */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

      <SiteNavbar activePage="About" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: mobile ? "120px 20px 80px" : "120px 48px 80px",
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(217,119,6,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", maxWidth: 820, position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
            borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)",
            marginBottom: 32,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ffb77d", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Our Story</span>
          </div>

          <h1 style={{
            fontSize: "clamp(38px,5.5vw,80px)", fontWeight: 900, letterSpacing: "-0.04em",
            lineHeight: 1.08, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 24,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>
            We built the CRM<br />
            <span style={{ color: "#ffb77d" }}>we always wanted.</span>
          </h1>

          <p style={{
            fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.7)", lineHeight: 1.8,
            maxWidth: 560, margin: "0 auto 40px", fontFamily: "'Inter', sans-serif",
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.2s ease, transform 0.9s 0.2s ease",
          }}>
            Wazelo CRM was born from a simple frustration — managing WhatsApp conversations for a growing business was chaos. We fixed that.
          </p>

          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.3s ease, transform 0.9s 0.3s ease",
          }}>
            <a href={APP_REGISTER_URL} className="btn-primary" style={{
              padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 800,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>Start Free Trial</a>
            <a href="/#features" className="btn-ghost" style={{
              padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 600,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>See the product</a>
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section ref={missionView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: 48, height: 2, background: "linear-gradient(to right,#ffb77d,#d97707)", margin: "0 auto 40px",
            opacity: missionView.inView ? 1 : 0, transition: "opacity 0.8s ease",
          }} />
          <blockquote style={{
            fontSize: "clamp(22px,3vw,38px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.4,
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", fontStyle: "normal",
            opacity: missionView.inView ? 1 : 0, transform: missionView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>
            "Every Indian business deserves enterprise-grade customer communication — without the enterprise price tag."
          </blockquote>
          <p style={{
            fontSize: 13, color: "rgba(219,194,176,0.4)", marginTop: 24, letterSpacing: "0.08em",
            textTransform: "uppercase", fontFamily: "'Inter', sans-serif",
            opacity: missionView.inView ? 1 : 0, transition: "opacity 0.9s 0.25s ease",
          }}>
            — Our founding mission
          </p>
        </div>
      </section>

      {/* ── Founding Story ────────────────────────────────────────────────── */}
      <section ref={storyView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
          gap: mobile ? 40 : 80, alignItems: "center",
        }}>
          <div style={{
            opacity: storyView.inView ? 1 : 0, transform: storyView.inView ? "translateX(0)" : "translateX(-32px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 16 }}>Founding Story</span>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>
              Built out of<br />real frustration.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
              We ran a small services business in India. Our team was managing customer conversations across personal WhatsApp numbers — missed follow-ups, zero accountability, no visibility.
            </p>
            <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
              Every CRM we tried was built for email or calls — not WhatsApp. So in 2024, we decided to build our own.
            </p>
            <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif" }}>
              Wazelo CRM is what we wished existed — a shared inbox, campaign tools, automation, and analytics, all purpose-built for WhatsApp.
            </p>
          </div>

          <div style={{
            opacity: storyView.inView ? 1 : 0, transform: storyView.inView ? "translateX(0)" : "translateX(32px)",
            transition: "opacity 0.9s 0.15s ease, transform 0.9s 0.15s ease",
          }}>
            <div style={{
              background: "var(--surface)", borderRadius: 20,
              border: "1px solid rgba(255,183,125,0.2)",
              padding: "40px 36px",
              boxShadow: "0 0 60px rgba(217,119,6,0.06)",
            }}>
              {[
                { year: "2024", event: "Idea formed — WhatsApp CRM for Indian SMBs" },
                { year: "Q1 2025", event: "MVP launched with shared inbox + campaigns" },
                { year: "Q2 2025", event: "Automation engine + chatbot builder shipped" },
                { year: "Now", event: "Powering hundreds of teams across India" },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 20, marginBottom: i < 3 ? 28 : 0, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 72, fontSize: 11, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.06em", fontFamily: "'Inter', sans-serif", paddingTop: 2 }}>{m.year}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 1, background: "rgba(255,183,125,0.15)", marginBottom: 10 }} />
                    <p style={{ fontSize: 14, color: "rgba(219,194,176,0.7)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Values ───────────────────────────────────────────────────── */}
      <section ref={valuesView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 12 }}>What we stand for</span>
            <h2 style={{
              fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em",
              color: "#e5e2e1", fontFamily: "'Inter', sans-serif",
              opacity: valuesView.inView ? 1 : 0, transform: valuesView.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}>Our core values</h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : tablet ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 16,
            opacity: valuesView.inView ? 1 : 0, transform: valuesView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>
            {values.map(v => <ValueCard key={v.title} {...v} />)}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section ref={statsView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{
              fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em",
              color: "#e5e2e1", fontFamily: "'Inter', sans-serif",
              opacity: statsView.inView ? 1 : 0, transition: "opacity 0.8s ease",
            }}>Growing every day</h2>
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 16,
            opacity: statsView.inView ? 1 : 0, transition: "opacity 0.9s 0.1s ease",
          }}>
            <StatCard value={500} suffix="+" label="Teams using Wazelo CRM" active={statsView.inView} />
            <StatCard value={2000000} suffix="+" label="Messages sent per day" active={statsView.inView} />
            <StatCard value={99} suffix=".9%" label="Platform uptime SLA" active={statsView.inView} />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.08)",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16,
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            Ready to get started?
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.7,
            fontFamily: "'Inter', sans-serif", marginBottom: 36,
            opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease",
          }}>
            Join hundreds of Indian businesses already using Wazelo CRM to manage their WhatsApp relationships.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={APP_REGISTER_URL} className="btn-primary" style={{
              padding: "16px 40px", borderRadius: 100, fontSize: 15, fontWeight: 800,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
              opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.8s 0.2s ease, transform 0.8s 0.2s ease",
            }}>Start your free trial</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
