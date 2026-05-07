"use client";

import { useState } from "react";
import { useInView, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Contact form with controlled state ───────────────────────────────────────
function ContactForm() {
  const { mobile } = useBreakpoint();
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const subjects = [
    { value: "general", label: "General enquiry" },
    { value: "sales", label: "Sales & pricing" },
    { value: "support", label: "Technical support" },
    { value: "security", label: "Security / compliance" },
    { value: "partnership", label: "Partnership" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    // Mailto fallback — open email client with pre-filled body
    const body = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\nSubject: ${form.subject}\n\n${form.message}`
    );
    window.location.href = `mailto:hello@wazelo.in?subject=${encodeURIComponent(form.subject + " — " + form.name)}&body=${body}`;
    setStatus("sent");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 10,
    background: "var(--surface-high)", border: "1px solid rgba(255,183,125,0.12)",
    color: "#e5e2e1", fontSize: 14, fontFamily: "'Inter', sans-serif",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "rgba(219,194,176,0.6)",
    marginBottom: 8, letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Your name *</label>
          <input required style={inputStyle} placeholder="Ravi Kumar" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onFocus={e => (e.target.style.borderColor = "rgba(255,183,125,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,183,125,0.12)")} />
        </div>
        <div>
          <label style={labelStyle}>Work email *</label>
          <input required type="email" style={inputStyle} placeholder="ravi@company.in" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onFocus={e => (e.target.style.borderColor = "rgba(255,183,125,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,183,125,0.12)")} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Company name</label>
        <input style={inputStyle} placeholder="Acme Pvt Ltd" value={form.company}
          onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
          onFocus={e => (e.target.style.borderColor = "rgba(255,183,125,0.4)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,183,125,0.12)")} />
      </div>
      <div>
        <label style={labelStyle}>Subject</label>
        <select style={{ ...inputStyle, cursor: "pointer" }} value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
          {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Message *</label>
        <textarea required rows={5} style={{ ...inputStyle, resize: "vertical" }} placeholder="Tell us how we can help..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          onFocus={e => (e.target.style.borderColor = "rgba(255,183,125,0.4)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,183,125,0.12)")} />
      </div>
      <button type="submit" disabled={status === "sending"} className="btn-primary" style={{
        padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 800,
        border: "none", cursor: status === "sending" ? "wait" : "pointer",
        fontFamily: "'Inter', sans-serif", alignSelf: "flex-start",
        opacity: status === "sending" ? 0.7 : 1,
      }}>
        {status === "sending" ? "Opening email..." : status === "sent" ? "Message ready ✓" : "Send message"}
      </button>
      {status === "sent" && (
        <p style={{ fontSize: 13, color: "#34d399", fontFamily: "'Inter', sans-serif" }}>
          Your email client should have opened. If not, email us directly at <a href="mailto:hello@wazelo.in" style={{ color: "#ffb77d" }}>hello@wazelo.in</a>
        </p>
      )}
    </form>
  );
}

export default function ContactPage() {
  const { mobile } = useBreakpoint();
  const heroView    = useInView(0.1);
  const formView    = useInView(0.05);

  const channels = [
    { icon: "mail", title: "Email us", value: "hello@wazelo.in", href: "mailto:hello@wazelo.in", desc: "General enquiries & sales" },
    { icon: "support_agent", title: "Support", value: "support@wazelo.in", href: "mailto:support@wazelo.in", desc: "Technical help & account issues" },
    { icon: "handshake", title: "Partnerships", value: "partners@wazelo.in", href: "mailto:partners@wazelo.in", desc: "Integrations & reseller enquiries" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{ minHeight: "55vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "120px 20px 60px" : "120px 48px 60px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(217,119,6,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 700, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)", marginBottom: 28, opacity: heroView.inView ? 1 : 0, transition: "opacity 0.8s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ffb77d", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Get in touch</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px,5.5vw,68px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 20, opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease" }}>
            We&apos;re here to help.
          </h1>
          <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.7)", lineHeight: 1.8, fontFamily: "'Inter', sans-serif", opacity: heroView.inView ? 1 : 0, transition: "opacity 0.9s 0.2s ease" }}>
            Sales, support, security, or partnerships — reach out and we&apos;ll respond within one business day.
          </p>
        </div>
      </section>

      {/* ── Contact channels ──────────────────────────────────────────────── */}
      <section style={{ background: "var(--surface-low)", padding: mobile ? "0 20px 60px" : "0 48px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {channels.map(c => (
            <a key={c.title} href={c.href} style={{ textDecoration: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px", transition: "border-color 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,183,125,0.3)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#ffb77d", marginBottom: 12, display: "block" }}>{c.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: "#ffb77d", fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>{c.value}</p>
              <p style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: "'Inter', sans-serif" }}>{c.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── Form + Info ───────────────────────────────────────────────────── */}
      <section ref={formView.ref} style={{ background: "var(--bg)", padding: mobile ? "60px 20px 100px" : "80px 48px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: mobile ? "1fr" : "3fr 2fr", gap: mobile ? 48 : 72, alignItems: "flex-start" }}>

          {/* Form */}
          <div style={{ opacity: formView.inView ? 1 : 0, transform: formView.inView ? "translateX(0)" : "translateX(-24px)", transition: "opacity 0.9s ease, transform 0.9s ease" }}>
            <h2 style={{ fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 32 }}>Send us a message</h2>
            <ContactForm />
          </div>

          {/* Info panel */}
          <div style={{ opacity: formView.inView ? 1 : 0, transform: formView.inView ? "translateX(0)" : "translateX(24px)", transition: "opacity 0.9s 0.12s ease, transform 0.9s 0.12s ease" }}>
            <div style={{ background: "var(--surface)", border: "1px solid rgba(255,183,125,0.12)", borderRadius: 20, padding: "36px 32px", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>Typical response times</h3>
              {[
                { type: "Sales enquiries", time: "< 4 hours" },
                { type: "Technical support", time: "< 8 hours" },
                { type: "Security / compliance", time: "< 24 hours" },
                { type: "Partnerships", time: "2–3 business days" },
              ].map((r, i, arr) => (
                <div key={r.type} style={{ display: "flex", justifyContent: "space-between", paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? "1px solid rgba(255,183,125,0.06)" : "none" }}>
                  <span style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif" }}>{r.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>{r.time}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid rgba(255,183,125,0.12)", borderRadius: 20, padding: "36px 32px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>Ready to start?</h3>
              <p style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", lineHeight: 1.7, fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
                Skip the queue — sign up for a free trial and explore Wazelo CRM yourself in minutes.
              </p>
              <a href={APP_REGISTER_URL} className="btn-primary" style={{ display: "block", padding: "13px 20px", borderRadius: 100, fontSize: 13, fontWeight: 800, textDecoration: "none", fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
                Start free trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
