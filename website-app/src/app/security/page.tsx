"use client";

import { useInView, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

function PillarCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px" }}>
      <span className="material-symbols-outlined card-icon" style={{ fontSize: 26, color: "var(--c-primary-container)", marginBottom: 14, display: "block" }}>{icon}</span>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 8, fontFamily: "var(--font-geist-sans), sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--c-on-surface-variant)", lineHeight: 1.75, fontFamily: "var(--font-geist-sans), sans-serif" }}>{desc}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--c-success)", marginTop: 2, flexShrink: 0 }}>check_circle</span>
      <span style={{ fontSize: 14, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", lineHeight: 1.65 }}>{text}</span>
    </li>
  );
}

export default function SecurityPage() {
  const { mobile, tablet } = useBreakpoint();
  const heroView   = useInView(0.1);
  const pillarsView = useInView(0.1);
  const infraView  = useInView(0.1);
  const compView   = useInView(0.1);
  const ctaView    = useInView(0.2);

  const pillars = [
    { icon: "qr_code_2", title: "QR-linked WhatsApp", desc: "You link your number the same way you link WhatsApp Web: Settings, Linked Devices, Link a Device. Admins can see and disconnect any team member's WhatsApp session." },
    { icon: "privacy_tip", title: "GDPR tools", desc: "Record a contact's consent, export the data you hold on them, or erase it when they ask." },
    { icon: "manage_accounts", title: "Role-based access control", desc: "Admin, Manager, and Employee roles with permissions you can edit, plus teams to group your people." },
    { icon: "corporate_fare", title: "Separate data per organisation", desc: "Every record is scoped to your organisation, so other customers cannot see your conversations, contacts, or settings." },
    { icon: "history", title: "Audit logs", desc: "User actions are recorded in audit logs that admins can review." },
    { icon: "verified_user", title: "Secure sign-in", desc: "Passwords are hashed, sessions use short-lived access tokens with refresh tokens, and login attempts are rate limited." },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "120px 20px 80px" : "120px 48px 80px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,color-mix(in srgb, var(--c-success) 6%, transparent) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 760, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "color-mix(in srgb, var(--c-success) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--c-success) 20%, transparent)", marginBottom: 32, opacity: heroView.inView ? 1 : 0, transition: "opacity 0.8s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-success)", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-success)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-geist-sans), sans-serif" }}>Security & Trust</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px,5.5vw,72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 24, opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease" }}>
            Your data is safe<br /><span style={{ color: "var(--c-success)" }}>with us.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "var(--c-on-surface-variant)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto", fontFamily: "var(--font-geist-sans), sans-serif", opacity: heroView.inView ? 1 : 0, transition: "opacity 0.9s 0.2s ease" }}>
            Wazelo CRM keeps each organisation&apos;s data separate and gives admins roles, permissions, audit logs, and GDPR tools.
          </p>
        </div>
      </section>

      {/* ── Security Pillars ──────────────────────────────────────────────── */}
      <section ref={pillarsView.ref} style={{ background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 12 }}>How we protect you</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", opacity: pillarsView.inView ? 1 : 0, transform: pillarsView.inView ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>Security by design</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : tablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: 16, opacity: pillarsView.inView ? 1 : 0, transform: pillarsView.inView ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease" }}>
            {pillars.map(p => <PillarCard key={p.title} {...p} />)}
          </div>
        </div>
      </section>

      {/* ── Infrastructure ────────────────────────────────────────────────── */}
      <section ref={infraView.ref} style={{ background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ opacity: infraView.inView ? 1 : 0, transform: infraView.inView ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.9s ease, transform 0.9s ease" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 14 }}>Connection</span>
            <h2 style={{ fontSize: "clamp(26px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 24 }}>
              Sessions that reconnect on their own.
            </h2>
            <p style={{ fontSize: 16, color: "var(--c-on-surface-variant)", lineHeight: 1.85, fontFamily: "var(--font-geist-sans), sans-serif", maxWidth: 560, margin: "0 auto 32px" }}>
              Your linked WhatsApp session reconnects after short drops, so your team does not need to rescan the QR code. Campaign messages go out in batches with rate limits.
            </p>
            <p style={{ fontSize: 15, color: "var(--c-placeholder)", lineHeight: 1.8, fontFamily: "var(--font-geist-sans), sans-serif", maxWidth: 500, margin: "0 auto" }}>
              Have questions from your procurement or compliance team? <a href="/contact" style={{ color: "var(--c-primary-container)", textDecoration: "none" }}>Contact us</a> and we&apos;ll answer them.
            </p>
          </div>
        </div>
      </section>

      {/* ── Compliance ────────────────────────────────────────────────────── */}
      <section ref={compView.ref} style={{ background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 12 }}>Compliance</span>
          <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 20, opacity: compView.inView ? 1 : 0, transition: "opacity 0.8s ease" }}>
            Tools for your data requests.
          </h2>
          <p style={{ fontSize: 16, color: "var(--c-on-surface-variant)", lineHeight: 1.8, fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 48, opacity: compView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease" }}>
            Handle consent, access, and deletion requests from inside Wazelo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16, opacity: compView.inView ? 1 : 0, transition: "opacity 0.9s 0.15s ease" }}>
            {[
              { icon: "fact_check", title: "Consent records", desc: "Record whether a contact has given consent to be messaged." },
              { icon: "download", title: "Data export and erasure", desc: "Export a contact's data or erase it when they ask." },
              { icon: "receipt_long", title: "Audit trail", desc: "Audit logs record user actions so admins can review who changed what." },
            ].map(c => (
              <div key={c.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px", textAlign: "left" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: "var(--c-primary-container)", marginBottom: 14, display: "block" }}>{c.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 8, fontFamily: "var(--font-geist-sans), sans-serif" }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "var(--c-on-surface-variant)", lineHeight: 1.7, fontFamily: "var(--font-geist-sans), sans-serif" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{ background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px", borderTop: "1px solid rgb(var(--fx-accent) / 0.08)" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 16, opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>
            Questions about security?
          </h2>
          <p style={{ fontSize: 16, color: "var(--c-on-surface-variant)", lineHeight: 1.7, fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 36, opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease" }}>
            Write to us and we will answer your questions about how Wazelo handles your data.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.2s ease" }}>
            <a href="/contact" className="btn-primary" style={{ padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 800, textDecoration: "none", fontFamily: "var(--font-geist-sans), sans-serif", display: "inline-block" }}>Contact our team</a>
            <a href={APP_REGISTER_URL} className="btn-ghost" style={{ padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-geist-sans), sans-serif", display: "inline-block" }}>Start free trial</a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
