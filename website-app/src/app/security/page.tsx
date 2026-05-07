"use client";

import { useInView, useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

function PillarCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px" }}>
      <span className="material-symbols-outlined card-icon" style={{ fontSize: 26, color: "#ffb77d", marginBottom: 14, display: "block" }}>{icon}</span>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif" }}>{desc}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#34d399", marginTop: 2, flexShrink: 0 }}>check_circle</span>
      <span style={{ fontSize: 14, color: "rgba(219,194,176,0.75)", fontFamily: "'Inter', sans-serif", lineHeight: 1.65 }}>{text}</span>
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
    { icon: "lock", title: "Data encryption", desc: "All your data — in transit and at rest — is encrypted. Your conversations and contact information are never stored in plain text." },
    { icon: "shield", title: "Meta-approved platform", desc: "Wazelo CRM uses the official WhatsApp Business API via Meta's Cloud API. All message handling complies with Meta's policies." },
    { icon: "manage_accounts", title: "Role-based access control", desc: "Admins, managers, and agents each have scoped permissions. Agents see only their assigned conversations — nothing more." },
    { icon: "corporate_fare", title: "Multi-tenant isolation", desc: "Each organisation's data is completely isolated. No other customer can ever see your conversations, contacts, or settings." },
    { icon: "history", title: "Full audit logs", desc: "Every user action — login, message sent, contact edited, settings changed — is logged for compliance review." },
    { icon: "verified_user", title: "Secure authentication", desc: "Strong authentication with short-lived sessions, automatic token rotation, and rate-limited login to prevent brute-force attacks." },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroView.ref} style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "120px 20px 80px" : "120px 48px 80px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(52,211,153,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 760, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", marginBottom: 32, opacity: heroView.inView ? 1 : 0, transition: "opacity 0.8s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Security & Trust</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px,5.5vw,72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 24, opacity: heroView.inView ? 1 : 0, transform: heroView.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.9s 0.1s ease, transform 0.9s 0.1s ease" }}>
            Your data is safe<br /><span style={{ color: "#34d399" }}>with us.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(219,194,176,0.7)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto", fontFamily: "'Inter', sans-serif", opacity: heroView.inView ? 1 : 0, transition: "opacity 0.9s 0.2s ease" }}>
            Wazelo CRM is built on enterprise-grade infrastructure with encryption, access controls, and compliance at every layer.
          </p>
        </div>
      </section>

      {/* ── Security Pillars ──────────────────────────────────────────────── */}
      <section ref={pillarsView.ref} style={{ background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 12 }}>How we protect you</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif", opacity: pillarsView.inView ? 1 : 0, transform: pillarsView.inView ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>Security by design</h2>
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
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 14 }}>Infrastructure</span>
            <h2 style={{ fontSize: "clamp(26px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.2, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>
              Enterprise-grade infrastructure.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", maxWidth: 560, margin: "0 auto 32px" }}>
              Wazelo CRM is hosted on reliable cloud infrastructure with high availability, automatic backups, and network-level protection — so your team stays connected and your data stays safe, around the clock.
            </p>
            <p style={{ fontSize: 15, color: "rgba(219,194,176,0.45)", lineHeight: 1.8, fontFamily: "'Inter', sans-serif", maxWidth: 500, margin: "0 auto" }}>
              Want a detailed security briefing for your procurement or compliance team? <a href="/contact" style={{ color: "#ffb77d", textDecoration: "none" }}>Contact us</a> and we&apos;ll walk you through our architecture privately.
            </p>
          </div>
        </div>
      </section>

      {/* ── Compliance ────────────────────────────────────────────────────── */}
      <section ref={compView.ref} style={{ background: "var(--surface-low)", padding: mobile ? "80px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 12 }}>Compliance</span>
          <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 20, opacity: compView.inView ? 1 : 0, transition: "opacity 0.8s ease" }}>
            Built for regulated industries.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.8, fontFamily: "'Inter', sans-serif", marginBottom: 48, opacity: compView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease" }}>
            Wazelo CRM is designed with compliance in mind — whether you&apos;re in healthcare, finance, or education.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16, opacity: compView.inView ? 1 : 0, transition: "opacity 0.9s 0.15s ease" }}>
            {[
              { icon: "policy", title: "WhatsApp Business Policy", desc: "All messaging complies with Meta's WhatsApp Business Policy and Commerce Policy." },
              { icon: "gavel", title: "Data localisation ready", desc: "Infrastructure can be configured for data residency requirements in India and other jurisdictions." },
              { icon: "receipt_long", title: "Audit trail", desc: "Full activity logs for every user action. Export logs for internal compliance review at any time." },
            ].map(c => (
              <div key={c.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px", textAlign: "left" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#ffb77d", marginBottom: 14, display: "block" }}>{c.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section ref={ctaView.ref} style={{ background: "var(--bg)", padding: mobile ? "80px 20px" : "100px 48px", borderTop: "1px solid rgba(255,183,125,0.08)" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16, opacity: ctaView.inView ? 1 : 0, transform: ctaView.inView ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>
            Questions about security?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(219,194,176,0.6)", lineHeight: 1.7, fontFamily: "'Inter', sans-serif", marginBottom: 36, opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.1s ease" }}>
            Our team is happy to walk you through our security architecture, answer compliance questions, or provide documentation for your procurement process.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", opacity: ctaView.inView ? 1 : 0, transition: "opacity 0.8s 0.2s ease" }}>
            <a href="/contact" className="btn-primary" style={{ padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 800, textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block" }}>Contact our team</a>
            <a href={APP_REGISTER_URL} className="btn-ghost" style={{ padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "'Inter', sans-serif", display: "inline-block" }}>Start free trial</a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
