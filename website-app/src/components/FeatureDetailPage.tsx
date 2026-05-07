"use client";

import React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useInView, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FeatureDetailData {
  slug: string;
  tag: string;
  heroTitle: string;
  heroSubtitle: string;
  heroScreen: string;
  overviewTitle: string;
  overviewDesc: string;
  capabilities: { icon: string; title: string; desc: string }[];
  howItWorks: { step: string; title: string; desc: string }[];
  screens?: { src: string; caption: string }[];
  relatedFeatures: { label: string; href: string; icon: string }[];
  interactiveSection?: React.ReactNode;
}

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const h = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: `${progress}%`, height: 2, zIndex: 100,
      background: "linear-gradient(to right, #ffb77d, #d97707)",
      transition: "width 0.1s linear",
      boxShadow: "0 0 8px rgba(255,183,125,0.6)",
    }} />
  );
}


// ─── Section Label (animated underline reveal) ────────────────────────────────
function SectionLabel({ text, inView }: { text: string; inView: boolean }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 14 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#ffb77d", fontFamily: "'Inter', sans-serif",
        opacity: inView ? 1 : 0, transition: "opacity 0.6s ease",
      }}>{text}</span>
      <div style={{
        height: 1, background: "linear-gradient(to right,transparent,#ffb77d,transparent)",
        width: inView ? "100%" : "0%", transition: "width 0.7s 0.2s ease",
      }} />
    </div>
  );
}

// ─── Capability Card ──────────────────────────────────────────────────────────
function CapabilityCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-card" style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "28px 24px", height: "100%",
    }}>
      <span className="material-symbols-outlined card-icon" style={{ fontSize: 26, color: "#ffb77d", marginBottom: 14, display: "block" }}>{icon}</span>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif" }}>{desc}</p>
    </div>
  );
}

// ─── Main Feature Detail Page ─────────────────────────────────────────────────
export default function FeatureDetailPage({ data }: { data: FeatureDetailData }) {
  const { mobile, tablet } = useBreakpoint();

  const heroView      = useInView(0.05);
  const overView      = useInView(0.15);
  const capsView      = useInView(0.08);
  const howView       = useInView(0.08);
  const interactView  = useInView(0.08);
  const relatedView   = useInView(0.15);
  const ctaView       = useInView(0.2);

  // Parallax offset for hero glow
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      <style>{`
        @keyframes featureGlowPulse {
          0%,100% { opacity:0.07; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:0.13; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes featureBadgePop {
          0%   { opacity:0; transform:translateY(-8px) scale(0.9); }
          100% { opacity:1; transform:translateY(0)   scale(1); }
        }
        @keyframes featureLineGrow {
          from { transform:scaleX(0); }
          to   { transform:scaleX(1); }
        }
        @keyframes featureStepPing {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,183,125,0.4); }
          50%     { box-shadow: 0 0 0 8px rgba(255,183,125,0); }
        }
        @keyframes featureCtaGlow {
          0%,100% { box-shadow: 0 0 40px 0px rgba(255,183,125,0.15); }
          50%     { box-shadow: 0 0 80px 20px rgba(255,183,125,0.25); }
        }
        @keyframes featureFloatUp {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }
      `}</style>

      <ScrollProgress />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar activePage="Features" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: mobile ? "120px 20px 60px" : "120px 48px 60px",
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>
        {/* Animated ambient glow */}
        <div style={{
          position: "absolute", top: "35%", left: "50%",
          width: 800, height: 800, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(217,119,6,0.09) 0%,transparent 70%)",
          pointerEvents: "none",
          animation: "featureGlowPulse 6s ease-in-out infinite",
          transform: `translate(-50%,-50%) translateY(${scrollY * 0.15}px)`,
        }} />
        {/* Secondary glow ring */}
        <div style={{
          position: "absolute", top: "60%", left: "30%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(217,119,6,0.04) 0%,transparent 70%)",
          pointerEvents: "none",
          transform: `translateY(${scrollY * -0.08}px)`,
        }} />

        <div style={{ textAlign: "center", maxWidth: 860, position: "relative", zIndex: 1 }}>
          {/* Breadcrumb */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
            opacity: heroView.inView ? 1 : 0,
            transform: heroView.inView ? "translateY(0)" : "translateY(-12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            animation: heroView.inView ? "featureBadgePop 0.5s ease forwards" : "none",
          }}>
            <a href="/#features" style={{ fontSize: 12, color: "rgba(219,194,176,0.4)", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}>Features</a>
            <span style={{ fontSize: 12, color: "rgba(219,194,176,0.2)", fontFamily: "'Inter', sans-serif" }}>/</span>
            <span style={{
              fontSize: 12, color: "#ffb77d", fontFamily: "'Inter', sans-serif", fontWeight: 600,
              background: "rgba(255,183,125,0.08)", padding: "3px 10px", borderRadius: 20,
              border: "1px solid rgba(255,183,125,0.2)",
            }}>{data.tag}</span>
          </div>

          <h1 style={{
            fontSize: "clamp(36px,5.5vw,76px)", fontWeight: 900, letterSpacing: "-0.04em",
            lineHeight: 1.06, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 24,
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}
            dangerouslySetInnerHTML={{ __html: data.heroTitle }}
          />

          <p style={{
            fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.7)", lineHeight: 1.8,
            maxWidth: 580, margin: "0 auto 40px", fontFamily: "'Inter', sans-serif",
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s 0.22s ease, transform 0.9s 0.22s ease",
          }}>
            {data.heroSubtitle}
          </p>

          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.9s 0.34s ease, transform 0.9s 0.34s ease",
          }}>
            <a href={APP_REGISTER_URL} className="btn-primary" style={{
              padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 800,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>Start Free Trial</a>
            <a href="/#features" className="btn-ghost" style={{
              padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 600,
              textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            }}>See all features</a>
          </div>
        </div>

        {/* Hero screenshot — floats gently */}
        {data.heroScreen && (
          <div style={{
            marginTop: 64, maxWidth: 1100, width: "100%", position: "relative", zIndex: 1,
            opacity: heroView.inView ? 1 : 0,
            transform: heroView.inView ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)",
            transition: "opacity 1.1s 0.45s ease, transform 1.1s 0.45s ease",
            animation: heroView.inView ? "featureFloatUp 5s 1.5s ease-in-out infinite" : "none",
          }}>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,183,125,0.15)", boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
              <Image src={data.heroScreen} alt={data.tag} width={1280} height={720} style={{ width: "100%", height: "auto", display: "block" }} priority />
            </div>
          </div>
        )}

        {/* Scroll cue */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          opacity: heroView.inView ? 0.5 : 0, transition: "opacity 1s 1.2s ease",
        }}>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#dbc2b0", fontFamily: "'Inter', sans-serif" }}>scroll</span>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom,#ffb77d,transparent)" }} />
        </div>
      </section>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      <section ref={overView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.06)", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative corner accent */}
        <div style={{
          position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
          width: overView.inView ? 120 : 0, height: 2,
          background: "linear-gradient(to right,transparent,#ffb77d,transparent)",
          transition: "width 1s ease",
        }} />
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: overView.inView ? 60 : 0, height: 2,
            background: "linear-gradient(to right,#ffb77d,#d97707)",
            margin: "0 auto 32px",
            transition: "width 0.8s ease",
          }} />
          <h2 style={{
            fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2,
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20,
            opacity: overView.inView ? 1 : 0, transform: overView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease",
          }}>{data.overviewTitle}</h2>
          <p style={{
            fontSize: 16, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif",
            opacity: overView.inView ? 1 : 0, transform: overView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.9s 0.2s ease, transform 0.9s 0.2s ease",
          }}>{data.overviewDesc}</p>
        </div>
      </section>

      {/* ── Capabilities ──────────────────────────────────────────────────── */}
      <section ref={capsView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionLabel text="What you can do" inView={capsView.inView} />
            <h2 style={{
              fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em",
              color: "#e5e2e1", fontFamily: "'Inter', sans-serif",
              opacity: capsView.inView ? 1 : 0, transform: capsView.inView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.8s 0.1s ease, transform 0.8s 0.1s ease",
            }}>Key capabilities</h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : tablet ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: 16,
          }}>
            {data.capabilities.map((c, i) => (
              <div key={c.title} style={{
                opacity: capsView.inView ? 1 : 0,
                transform: capsView.inView ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
                transition: `opacity 0.65s ${0.07 * i}s ease, transform 0.65s ${0.07 * i}s ease`,
              }}>
                <CapabilityCard {...c} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section ref={howView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionLabel text="How it works" inView={howView.inView} />
            <h2 style={{
              fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em",
              color: "#e5e2e1", fontFamily: "'Inter', sans-serif",
              opacity: howView.inView ? 1 : 0, transform: howView.inView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.8s 0.1s ease, transform 0.8s 0.1s ease",
            }}>Up and running in minutes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.howItWorks.map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: mobile ? 20 : 40, alignItems: "flex-start",
                paddingBottom: i < data.howItWorks.length - 1 ? 44 : 0, position: "relative",
                opacity: howView.inView ? 1 : 0,
                transform: howView.inView ? "translateX(0)" : "translateX(-36px)",
                transition: `opacity 0.7s ${0.13 * i}s ease, transform 0.7s ${0.13 * i}s ease`,
              }}>
                {/* Animated connector line */}
                {i < data.howItWorks.length - 1 && (
                  <div style={{
                    position: "absolute", left: mobile ? 19 : 27, top: mobile ? 44 : 60,
                    width: 2, height: "calc(100% - 24px)",
                    background: "linear-gradient(to bottom,rgba(255,183,125,0.35),rgba(255,183,125,0.04))",
                    transformOrigin: "top",
                    transform: howView.inView ? "scaleY(1)" : "scaleY(0)",
                    transition: `transform 0.6s ${0.13 * i + 0.3}s ease`,
                  }} />
                )}
                {/* Step circle with ping animation */}
                <div style={{
                  width: mobile ? 40 : 56, height: mobile ? 40 : 56, borderRadius: "50%",
                  background: "rgba(255,183,125,0.1)", border: "1px solid rgba(255,183,125,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  animation: howView.inView ? `featureStepPing 2.5s ${0.3 * i}s ease-in-out infinite` : "none",
                }}>
                  <span style={{ fontSize: mobile ? 13 : 16, fontWeight: 800, color: "#ffb77d", fontFamily: "'Inter', sans-serif" }}>{step.step}</span>
                </div>
                <div style={{ paddingTop: mobile ? 8 : 14 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(219,194,176,0.6)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Section ───────────────────────────────────────────── */}
      {data.interactiveSection && (
        <section ref={interactView.ref} style={{
          background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
          borderTop: "1px solid rgba(255,183,125,0.06)",
        }}>
          <div style={{
            maxWidth: 1100, margin: "0 auto",
            opacity: interactView.inView ? 1 : 0,
            transform: interactView.inView ? "translateY(0) scale(1)" : "translateY(40px) scale(0.98)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}>
            {data.interactiveSection}
          </div>
        </section>
      )}

      {/* ── Related Features ──────────────────────────────────────────────── */}
      <section ref={relatedView.ref} style={{
        background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.06)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <SectionLabel text="Keep exploring" inView={relatedView.inView} />
          <h2 style={{
            fontSize: "clamp(22px,2.5vw,36px)", fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 36,
            opacity: relatedView.inView ? 1 : 0, transform: relatedView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s 0.1s ease, transform 0.8s 0.1s ease",
          }}>Related features</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {data.relatedFeatures.map((f, i) => (
              <a key={f.label} href={f.href} style={{
                display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 20px",
                borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)",
                textDecoration: "none",
                opacity: relatedView.inView ? 1 : 0,
                transform: relatedView.inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.94)",
                transition: `opacity 0.6s ${0.07 * i}s ease, transform 0.6s ${0.07 * i}s ease, border-color 0.2s, background 0.2s`,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,183,125,0.35)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-high)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface)"; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#ffb77d" }}>{f.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#dbc2b0", fontFamily: "'Inter', sans-serif" }}>{f.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{
        background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px",
        borderTop: "1px solid rgba(255,183,125,0.08)", position: "relative", overflow: "hidden",
      }}>
        {/* Animated CTA glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 600, height: 300, borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(217,119,6,0.08) 0%,transparent 70%)",
          pointerEvents: "none",
          animation: ctaView.inView ? "featureCtaGlow 3s ease-in-out infinite" : "none",
        }} />
        <div style={{ maxWidth: 660, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-0.04em",
            color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16,
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}>
            Ready to try <span style={{ color: "#ffb77d" }}>{data.tag}?</span>
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.7,
            fontFamily: "'Inter', sans-serif", marginBottom: 36,
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s 0.12s ease, transform 0.8s 0.12s ease",
          }}>
            Free trial. No credit card required. Setup in under 5 minutes.
          </p>
          <a href={APP_REGISTER_URL} className="btn-primary" style={{
            padding: "16px 40px", borderRadius: 100, fontSize: 15, fontWeight: 800,
            textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block",
            opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s 0.24s ease, transform 0.8s 0.24s ease",
          }}>Start for free</a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
