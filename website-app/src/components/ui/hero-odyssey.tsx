"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";
const APP_LOGIN_URL = "https://app.wazelo.in/auth/login";

// ─── DashBar — animated bar for analytics chart ──────────────────────────────
const DashBar: React.FC<{ pct: number }> = ({ pct }) => {
  const [h, setH] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setH(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{
      width: "100%",
      height: `${h}%`,
      background: "linear-gradient(to top, #d97707, #ffb77d)",
      borderRadius: "4px 4px 0 0",
      transition: "height 0.8s ease",
    }} />
  );
};

// ─── Dashboard animation data sets (cycle through on interval) ───────────────
const DASH_STATES = [
  {
    range: 0,
    kpis: [
      { label: "Total Messages", value: "48,500", delta: "+12%", icon: "forum" },
      { label: "Avg Response",   value: "4m 12s", delta: "-8%",  icon: "timer" },
      { label: "CSAT Score",     value: "4.3/5",  delta: "+0.3", icon: "star"  },
      { label: "Resolution Rate",value: "87%",    delta: "+5%",  icon: "check_circle" },
    ],
    bars: [62, 88, 45, 91, 73, 58, 84],
  },
  {
    range: 1,
    kpis: [
      { label: "Total Messages", value: "186,200", delta: "+18%", icon: "forum" },
      { label: "Avg Response",   value: "3m 50s",  delta: "-14%", icon: "timer" },
      { label: "CSAT Score",     value: "4.5/5",   delta: "+0.5", icon: "star"  },
      { label: "Resolution Rate",value: "91%",     delta: "+9%",  icon: "check_circle" },
    ],
    bars: [55, 70, 80, 65, 90, 78, 88],
  },
  {
    range: 2,
    kpis: [
      { label: "Total Messages", value: "541,000", delta: "+22%", icon: "forum" },
      { label: "Avg Response",   value: "3m 30s",  delta: "-19%", icon: "timer" },
      { label: "CSAT Score",     value: "4.6/5",   delta: "+0.6", icon: "star"  },
      { label: "Resolution Rate",value: "93%",     delta: "+11%", icon: "check_circle" },
    ],
    bars: [72, 65, 88, 76, 95, 83, 91],
  },
];

const NAV_ITEMS = [
  { icon: "💬", label: "Inbox" },
  { icon: "📊", label: "Analytics" },
  { icon: "👥", label: "Contacts" },
  { icon: "📢", label: "Campaigns" },
  { icon: "⚡", label: "Automation" },
  { icon: "⚙️", label: "Settings"  },
];

// ─── Hero Section ─────────────────────────────────────────────────────────────
export const HeroSection: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashState, setDashState] = useState(0);
  const [activeNav, setActiveNav] = useState(1);

  // ── Custom page cursor ──
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 18}px, ${e.clientY - 18}px)`;
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 3}px)`;
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // ── Mockup fake cursor waypoints (% of mockup content area) ──
  const WAYPOINTS = [
    { x: 18, y: 15 },  // Analytics nav item
    { x: 70, y: 12 },  // 30D range toggle
    { x: 25, y: 38 },  // KPI card 1
    { x: 75, y: 38 },  // KPI card 4
    { x: 35, y: 65 },  // bar chart
    { x: 80, y: 65 },  // leaderboard
    { x: 50, y: 88 },  // campaign table
  ];
  const [cursorWp, setCursorWp] = useState(0);
  const [clicking, setClicking] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setClicking(true);
      setTimeout(() => setClicking(false), 180);
      setTimeout(() => setCursorWp(w => (w + 1) % WAYPOINTS.length), 220);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  // Cycle range + KPIs every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setDashState(s => (s + 1) % DASH_STATES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Cycle active nav item every 2.5s
  useEffect(() => {
    const t = setInterval(() => {
      setActiveNav(n => (n + 1) % NAV_ITEMS.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const ds = DASH_STATES[dashState];
  const wp = WAYPOINTS[cursorWp];

  const navLinks: [string, string][] = [
    ["Features", "#features"],
    ["Use Cases", "/use-cases"],
    ["Pricing", "#pricing"],
    ["About", "/about"],
  ];

  const fade = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
    }),
  };

  return (
    <div style={{ position: "relative", width: "100%", background: "#131313", color: "#fff", fontFamily: "'Inter',sans-serif", cursor: "none" }}>

      {/* ── Custom page cursor ── */}
      <div ref={cursorRef} style={{
        position: "fixed", top: 0, left: 0, zIndex: 9999,
        width: 36, height: 36, borderRadius: "50%",
        border: "1.5px solid rgba(255,183,125,0.7)",
        pointerEvents: "none", transition: "transform 0.08s linear",
        mixBlendMode: "normal",
      }} />
      <div ref={cursorDotRef} style={{
        position: "fixed", top: 0, left: 0, zIndex: 9999,
        width: 6, height: 6, borderRadius: "50%",
        background: "#ffb77d",
        pointerEvents: "none", transition: "transform 0.04s linear",
      }} />

      {/* ── Background layer ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: "hidden" }}>

        {/* Light beam — shoots up from top center, like 96AI */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 2, height: "55%",
          background: "linear-gradient(to bottom, rgba(255,210,140,0.95) 0%, rgba(255,183,125,0.6) 30%, rgba(217,119,6,0.15) 75%, transparent 100%)",
          filter: "blur(0px)",
          zIndex: 2,
        }} />
        {/* Beam core glow — slightly wider soft layer */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 60, height: "50%",
          background: "linear-gradient(to bottom, rgba(255,200,120,0.25) 0%, rgba(217,119,6,0.12) 50%, transparent 100%)",
          filter: "blur(18px)",
          zIndex: 1,
        }} />
        {/* Wide ambient bloom at the tip */}
        <div style={{
          position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,200,120,0.22) 0%, rgba(217,119,6,0.08) 50%, transparent 75%)",
          filter: "blur(30px)",
          zIndex: 1,
        }} />

        {/* Bottom warm glow pool */}
        <div style={{
          position: "absolute", bottom: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(180,80,0,0.35) 0%, rgba(120,40,0,0.15) 50%, transparent 75%)",
          filter: "blur(60px)",
          zIndex: 1,
        }} />

        {/* Dark vignette edges */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)", zIndex: 3 }} />
      </div>

      {/* ── Content layer ── */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: 60 }}>

        {/* Navbar */}
        <div style={{ padding: "20px 32px 0", display: "flex", justifyContent: "center" }}>
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: "flex", alignItems: "center", gap: 0,
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 100, padding: "8px 12px 8px 20px",
              width: "100%", maxWidth: 780,
              justifyContent: "space-between",
            }}
          >
            {/* Logo */}
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>
              Wazelo <span style={{ color: "#ffb77d" }}>CRM</span>
            </span>

            {/* Desktop nav links */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }} className="wz-hidden-mobile">
              {navLinks.map(([label, href]) => (
                <a key={label} href={href} style={{
                  fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)",
                  textDecoration: "none", padding: "6px 14px", borderRadius: 100,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >{label}</a>
              ))}
            </div>

            {/* CTA group */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <a href={APP_LOGIN_URL} style={{
                fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)",
                textDecoration: "none", padding: "6px 14px", borderRadius: 100,
              }} className="wz-show-desktop">Sign In</a>
              <a href={APP_REGISTER_URL} style={{
                fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 100,
                background: "#fff", color: "#111", textDecoration: "none",
                whiteSpace: "nowrap",
              }} className="wz-nav-cta">Get Started Free</a>
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}
                className="wz-show-mobile"
                aria-label="Menu"
              >
                {[0,1,2].map(i => (
                  <span key={i} style={{ display: "block", width: 20, height: 2, background: "#fff", borderRadius: 2,
                    transform: menuOpen ? (i===0 ? "rotate(45deg) translate(4px,4px)" : i===2 ? "rotate(-45deg) translate(4px,-4px)" : "scaleX(0)") : "none",
                    transition: "all 0.25s ease",
                  }} />
                ))}
              </button>
            </div>
          </motion.nav>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.96)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}
            >
              <button onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: 24, right: 24, background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 24 }}>✕</button>
              {navLinks.map(([l, h]) => <a key={l} href={h} onClick={() => setMenuOpen(false)} style={{ fontSize: 20, color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>{l}</a>)}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <a href={APP_LOGIN_URL} style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", color: "#ddd", textDecoration: "none", fontSize: 14 }}>Sign In</a>
                <a href={APP_REGISTER_URL} style={{ padding: "12px 24px", borderRadius: 8, background: "#fff", color: "#111", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Get Started Free</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero body */}
        <div className="wz-hero-body" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "0 16px 0", position: "relative" }}>

          {/* ── Top text block ── */}
          <div className="wz-hero-text" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 680, position: "relative", zIndex: 2, width: "100%", paddingTop: 20, paddingBottom: 8 }}>

            {/* Badge */}
            <motion.a
              href={APP_REGISTER_URL}
              custom={0} variants={fade} initial="hidden" animate="show"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 100, marginBottom: 20,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)", textDecoration: "none",
                fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.85)",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffb77d", display: "inline-block", flexShrink: 0 }} />
              Official WhatsApp Business API
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3L13 8L8 13M13 8H3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.a>

            <motion.h1
              custom={1} variants={fade} initial="hidden" animate="show"
              style={{ fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1.05, margin: "0 0 10px", color: "#fff" }}
            >
              Wazelo CRM
            </motion.h1>

            <motion.h2
              custom={2} variants={fade} initial="hidden" animate="show"
              style={{ fontSize: "clamp(18px, 4.5vw, 42px)", fontWeight: 300, letterSpacing: "-0.03em", margin: "0 0 18px",
                background: "linear-gradient(135deg, #e0e0e0, #888)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              WhatsApp for Growing Teams
            </motion.h2>

            <motion.p
              custom={3} variants={fade} initial="hidden" animate="show"
              style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: "0 0 24px", maxWidth: 480 }}
            >
              Shared inbox, bulk campaigns, automation &amp; AI chatbot — all on the official WhatsApp Business API. From ₹499/mo.
            </motion.p>

            {/* CTAs */}
            <motion.div custom={4} variants={fade} initial="hidden" animate="show" className="wz-cta-row" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 12, width: "100%" }}>
              <a href={APP_REGISTER_URL} style={{
                padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14,
                background: "linear-gradient(135deg, #ffb77d, #d97707)",
                color: "#4d2600", textDecoration: "none",
                boxShadow: "0 0 40px rgba(255,183,125,0.25)",
              }}>Start Free Trial</a>
              <a href="/contact#demo" style={{
                padding: "12px 28px", borderRadius: 8, fontWeight: 500, fontSize: 14,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff", textDecoration: "none", backdropFilter: "blur(8px)",
              }}>Book a Demo</a>
            </motion.div>

            {/* Feature pills — arc layout */}
            <motion.div custom={5} variants={fade} initial="hidden" animate="show" className="wz-arc-pills"
              style={{ position: "relative", width: "100%", height: 160, marginTop: 12, marginBottom: 0, flexShrink: 0 }}>
              {/* Arc curve SVG */}
              {/* Arc curve SVG */}
              <svg viewBox="0 0 700 160" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <defs>
                  <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#d97707" stopOpacity="0" />
                    <stop offset="40%"  stopColor="#ef4444" stopOpacity="0.7" />
                    <stop offset="60%"  stopColor="#d97707" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#d97707" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#d97707" stopOpacity="0" />
                    <stop offset="50%"  stopColor="#ef4444" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#d97707" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 20 155 Q 350 -40 680 155" fill="none" stroke="url(#arcGlow)" strokeWidth="8" />
                <path d="M 20 155 Q 350 -40 680 155" fill="none" stroke="url(#arcGrad)" strokeWidth="1.5" />
              </svg>
              {/* Pills — positioned along the arc */}
              {([
                { label: "Shared Inbox",   sub: "real-time",   pct: 0.08, align: "left"   },
                { label: "Bulk Campaigns", sub: "broadcasts",  pct: 0.34, align: "center" },
                { label: "Automation",     sub: "no-code",     pct: 0.66, align: "center" },
                { label: "AI Chatbot",     sub: "24/7 replies",pct: 0.92, align: "right"  },
              ] as { label: string; sub: string; pct: number; align: "left"|"center"|"right" }[]).map(({ label, sub, pct, align }) => {
                // Arc y = quadratic bezier at t=pct: P0=(0,155) P1=(350,-40) P2=(700,155)
                const t = pct;
                const arcY = (1-t)*(1-t)*155 + 2*(1-t)*t*(-40) + t*t*155;
                const xPct = pct * 100;
                return (
                  <div key={label} style={{
                    position: "absolute",
                    left: `${xPct}%`, top: arcY / 160 * 100 + "%",
                    transform: align === "left" ? "translateY(-50%)" : align === "right" ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                    display: "flex", flexDirection: "column",
                    alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif", marginLeft: align === "left" ? 12 : 0, marginRight: align === "right" ? 12 : 0 }}>{sub}</span>
                  </div>
                );
              })}
            </motion.div>

          </div>

          {/* ── Analytics Dashboard Mockup ── */}
          <motion.div
            custom={6} variants={fade} initial="hidden" animate="show"
            className="wz-mockup"
            style={{
              width: "calc(100% + 0px)", maxWidth: 960,
              marginLeft: 0, marginRight: 0,
              position: "relative", zIndex: 5,
              flexShrink: 0,
              borderRadius: 28,
              padding: 2,
              border: "2px solid rgba(255,183,125,0.8)",
              background: "#131313",
              boxShadow: "0 40px 100px rgba(0,0,0,0.75), 0 0 80px rgba(217,119,6,0.15)",
            }}
          >
            {/* Inner screen — clipped content */}
            <div style={{ borderRadius: 26, overflow: "hidden", background: "#131313" }}
          >
            {/* Chrome bar */}
            <div style={{ background: "#0e0e0e", height: 38, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 20px", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Inter',sans-serif" }}>
                  app.wazelo.in/analytics
                </div>
              </div>
            </div>

            {/* App shell — sidebar + main */}
            <div style={{ display: "flex", height: 520, position: "relative" }}>

              {/* ── Fake cursor inside mockup ── */}
              <div style={{
                position: "absolute",
                left: `${wp.x}%`, top: `${wp.y}%`,
                zIndex: 20, pointerEvents: "none",
                transition: "left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1)",
              }}>
                {/* Arrow SVG */}
                <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))", transform: clicking ? "scale(0.85)" : "scale(1)", transition: "transform 0.12s ease" }}>
                  <path d="M2 2L2 18L6.5 13.5L9.5 20L11.5 19L8.5 12.5L15 12.5L2 2Z" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8"/>
                </svg>
                {/* Click ripple */}
                {clicking && (
                  <div style={{
                    position: "absolute", top: -6, left: -6,
                    width: 18, height: 18, borderRadius: "50%",
                    border: "1.5px solid rgba(255,183,125,0.8)",
                    animation: "none", opacity: 0.8,
                  }} />
                )}
              </div>

              {/* Sidebar nav */}
              <div className="wz-sidebar" style={{ width: 200, flexShrink: 0, background: "#0b0b0b", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", padding: "16px 0" }}>
                <div style={{ padding: "0 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", fontFamily: "'Inter',sans-serif" }}>Wazelo <span style={{ color: "#ffb77d" }}>CRM</span></span>
                </div>
                {NAV_ITEMS.map((item, idx) => {
                  const active = idx === activeNav;
                  return (
                    <div key={item.label} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 16px", margin: "1px 8px", borderRadius: 8,
                      background: active ? "rgba(255,183,125,0.12)" : "transparent",
                      borderLeft: active ? "2px solid #ffb77d" : "2px solid transparent",
                      transition: "all 0.4s ease",
                    }}>
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#ffb77d" : "rgba(229,226,225,0.45)", fontFamily: "'Inter',sans-serif", transition: "color 0.4s ease" }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Main content */}
              <div className="wz-dash-main" style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Page header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif" }}>Analytics</div>
                    <div style={{ fontSize: 11, color: "rgba(219,194,176,0.45)", fontFamily: "'Inter',sans-serif", marginTop: 2 }}>Last 7 days · Updated just now</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["7D","30D","90D"].map((r, i) => (
                      <div key={r} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, background: i === ds.range ? "rgba(255,183,125,0.15)" : "transparent", border: i === ds.range ? "1px solid rgba(255,183,125,0.3)" : "1px solid rgba(255,255,255,0.08)", color: i === ds.range ? "#ffb77d" : "rgba(229,226,225,0.45)", fontFamily: "'Inter',sans-serif", transition: "all 0.4s ease" }}>{r}</div>
                    ))}
                  </div>
                </div>

                {/* KPI cards — 4 cols, exact from AnalyticsMockup */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }} className="wz-kpi-grid">
                  {ds.kpis.map(kpi => {
                    const deltaColor = kpi.label === "Avg Response"
                      ? (kpi.delta.startsWith("-") ? "#34d399" : "#f87171")
                      : (kpi.delta.startsWith("+") ? "#34d399" : "#f87171");
                    return (
                      <div key={kpi.label} style={{ background: "#2a2a2a", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ffb77d", lineHeight: 1 }}>{kpi.icon}</span>
                          <span style={{ fontSize: 11, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter',sans-serif" }}>{kpi.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif" }}>{kpi.value}</span>
                          <span style={{ fontSize: 11, color: deltaColor, fontFamily: "'Inter',sans-serif" }}>{kpi.delta}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart + Leaderboard row — exact from AnalyticsMockup */}
                <div style={{ display: "grid", gridTemplateColumns: "60% 1fr", gap: 12 }} className="wz-chart-row">

                  {/* Bar chart */}
                  <div style={{ background: "#2a2a2a", borderRadius: 12, padding: "16px 16px 12px" }}>
                    <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>Message Volume — Last 7 Days</div>
                    <div style={{ height: 160, display: "flex", alignItems: "flex-end", gap: 6 }}>
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, di) => (
                        <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
                          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                            <DashBar pct={ds.bars[di]} />
                          </div>
                          <span style={{ fontSize: 9, color: "rgba(219,194,176,0.4)", fontFamily: "'Inter',sans-serif" }}>{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent leaderboard */}
                  <div style={{ background: "#2a2a2a", borderRadius: 12, padding: "16px 16px 12px" }}>
                    <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>Top Agents</div>
                    {[
                      { name: "Priya S.", convs: 142, time: "3m 40s", score: 4.8 },
                      { name: "Rahul K.", convs: 118, time: "5m 12s", score: 4.5 },
                      { name: "Meera J.", convs: 97,  time: "6m 05s", score: 4.1 },
                      { name: "Arjun T.", convs: 83,  time: "7m 22s", score: 3.9 },
                    ].map((agent, i) => (
                      <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "9px 0" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,183,125,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#ffb77d", flexShrink: 0, fontFamily: "'Inter',sans-serif" }}>{i + 1}</div>
                        <span style={{ fontSize: 12, color: "#e5e2e1", flex: 1, fontFamily: "'Inter',sans-serif" }}>{agent.name}</span>
                        <span style={{ fontSize: 11, color: "rgba(219,194,176,0.45)", minWidth: 28, textAlign: "right", fontFamily: "'Inter',sans-serif" }}>{agent.convs}</span>
                        <span style={{ fontSize: 10, color: "rgba(219,194,176,0.35)", minWidth: 40, textAlign: "right", fontFamily: "'Inter',sans-serif" }}>{agent.time}</span>
                        <span style={{ fontSize: 11, color: "#ffb77d", minWidth: 30, textAlign: "right", fontFamily: "'Inter',sans-serif" }}>{agent.score} ★</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campaign performance mini-table */}
                <div className="wz-campaign-table" style={{ background: "#2a2a2a", borderRadius: 12, padding: "16px" }}>
                  <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>Recent Campaigns</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: "8px 16px", alignItems: "center" }}>
                    {/* Header */}
                    {["Campaign", "Sent", "Delivered", "Read", "Replied"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: "rgba(219,194,176,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Inter',sans-serif" }}>{h}</div>
                    ))}
                    {/* Rows */}
                    {[
                      { name: "Diwali Offer 🎆",   sent: "12,400", del: "12,180", read: "9,840",  rep: "1,240" },
                      { name: "Restock Alert",      sent: "8,200",  del: "8,050",  read: "6,100",  rep: "820"   },
                      { name: "Follow-up Drip #3",  sent: "5,600",  del: "5,530",  read: "4,200",  rep: "670"   },
                    ].map(row => (
                      <React.Fragment key={row.name}>
                        <div style={{ fontSize: 12, color: "#e5e2e1", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                        {[row.sent, row.del, row.read, row.rep].map((v, vi) => (
                          <div key={vi} style={{ fontSize: 12, color: vi === 3 ? "#ffb77d" : "rgba(219,194,176,0.6)", textAlign: "right", fontFamily: "'Inter',sans-serif" }}>{v}</div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

              </div>
            </div>
            </div>{/* /inner screen */}
          </motion.div>

        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .wz-hidden-mobile { display: none !important; }
          .wz-show-mobile { display: flex !important; }
          .wz-show-desktop { display: none !important; }
          .wz-nav-cta { display: none !important; }
          .wz-globe {
            width: min(420px, 110vw) !important;
            height: min(420px, 110vw) !important;
            bottom: -22% !important;
          }
          .wz-hero-body { padding: 0 8px !important; }
          .wz-hero-text { padding-top: 16px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .wz-cta-row { flex-direction: column !important; width: 100% !important; }
          .wz-cta-row a { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
          .wz-mockup {
            border-radius: 14px !important;
            margin-bottom: 32px !important;
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .wz-mockup > div:nth-child(2) { height: auto !important; min-height: 480px !important; }
          .wz-sidebar { display: none !important; }
          /* KPI grid: 2×2 on mobile */
          .wz-kpi-grid { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          /* Chart + leaderboard: stack vertically on mobile */
          .wz-chart-row { grid-template-columns: 1fr !important; }
          /* Campaign table: hide on mobile (too many columns) */
          .wz-campaign-table { display: none !important; }
          .wz-arc-pills { display: none !important; }
          /* Tighter main content padding on mobile */
          .wz-dash-main { padding: 12px 10px !important; gap: 10px !important; }
        }
        @media (min-width: 641px) {
          .wz-show-mobile { display: none !important; }
          .wz-show-desktop { display: flex !important; }
          .wz-nav-cta { display: inline-block !important; }
        }
      `}</style>
    </div>
  );
};
