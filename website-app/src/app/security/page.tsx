"use client";

import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import { MobileToc } from "@/components/mobile-toc";
import SiteNavbar from "@/components/Navbar";

const sections = [
  { id: "protection",     label: "How we protect you" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "compliance",     label: "Compliance" },
];

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const link = "text-rust underline decoration-rust/30 underline-offset-4 transition-colors hover:decoration-rust";

function Item({ i, icon, title, desc }: { i: number; icon: string; title: string; desc: string }) {
  return (
    <div className="border-t border-ink/15 py-7">
      <div className="flex items-center justify-between">
        <span className="shrink-0 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
        <span aria-hidden className="material-symbols-outlined text-[20px] text-rust">{icon}</span>
      </div>
      <h3 className="mt-5 font-display text-2xl leading-tight text-ink">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{desc}</p>
    </div>
  );
}

export default function SecurityPage() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0].id);

  const pillars = [
    { icon: "lock", title: "Data encryption", desc: "All your data — in transit and at rest — is encrypted. Your conversations and contact information are never stored in plain text." },
    { icon: "shield", title: "Official or QR-linked numbers", desc: "Connect an official WhatsApp Cloud API number, which sends through Meta's own API, or link a number by QR code. Account health and send pacing help keep QR-linked numbers safe." },
    { icon: "manage_accounts", title: "Role-based access control", desc: "Admins, managers, and agents each have scoped permissions. Agents see only their assigned conversations — nothing more." },
    { icon: "corporate_fare", title: "Multi-tenant isolation", desc: "Each organisation's data is completely isolated. No other customer can ever see your conversations, contacts, or settings." },
    { icon: "history", title: "Full audit logs", desc: "Every user action — login, message sent, contact edited, settings changed — is logged for compliance review." },
    { icon: "verified_user", title: "Secure authentication", desc: "Strong authentication with short-lived sessions, automatic token rotation, and rate-limited login to prevent brute-force attacks." },
  ];

  const compliance = [
    { icon: "policy", title: "WhatsApp Business Policy", desc: "All messaging complies with Meta's WhatsApp Business Policy and Commerce Policy." },
    { icon: "gavel", title: "Data localisation ready", desc: "Infrastructure can be configured for data residency requirements in India and other jurisdictions." },
    { icon: "receipt_long", title: "Audit trail", desc: "Full activity logs for every user action. Export logs for internal compliance review at any time." },
  ];

  useGSAP(
    () => {
      const triggers = sections.map((s) =>
        ScrollTrigger.create({
          trigger: `#${s.id}`,
          start: "top 40%",
          end: "bottom 40%",
          onToggle: (self) => { if (self.isActive) setActive(s.id); },
        }),
      );
      ScrollTrigger.create({
        trigger: "[data-rd=body]",
        start: "bottom bottom",
        onEnter: () => setActive(sections[sections.length - 1].id),
        onLeaveBack: () => {
          const i = triggers.findIndex((t) => t.isActive);
          if (i >= 0) setActive(sections[i].id);
        },
      });

      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap.from("[data-rd=head] > *", { y: 24, autoAlpha: 0, stagger: 0.08, duration: 1, ease: "expo.out" });
        gsap.from("[data-rd=toc]", { autoAlpha: 0, duration: 1, delay: 0.3, ease: "power2.out" });
        gsap.utils.toArray<HTMLElement>("[data-rd=sec]").forEach((el) => {
          gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });
        gsap.from("[data-rd=end] > *", { y: 30, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: "[data-rd=end]", start: "top 80%", once: true } });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
        <div data-rd="head" className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Security & Trust</p>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em]">
            Your data is safe<br /><em className="text-rust">with us.</em>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Wazelo is built on enterprise-grade infrastructure with encryption, access controls, and compliance at every layer.
          </p>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-ink/10 px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">

          <aside className="hidden lg:block">
            <nav data-rd="toc" aria-label="On this page" className="sticky top-28">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">On this page</p>
              <ol className="mt-5 flex flex-col border-l border-ink/10">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setActive(s.id)}
                      aria-current={active === s.id ? "location" : undefined}
                      className={`-ml-px block border-l py-1.5 pl-4 text-sm transition-colors ${focusInk} ${active === s.id ? "border-rust font-medium text-rust" : "border-transparent text-ink-soft hover:text-ink"}`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="lg:hidden"><MobileToc items={sections} /></div>

          <main data-rd="body" className="max-w-[68ch] text-[17px] leading-relaxed text-ink-soft">

            {/* ── Security Pillars ── */}
            <section id="protection" data-rd="sec" className="scroll-mt-28 pb-14">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">How we protect you</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">Security by design</h2>
              <div className="mt-8 grid gap-x-10 sm:grid-cols-2">
                {pillars.map((p, i) => <Item key={p.title} i={i} {...p} />)}
              </div>
            </section>

            {/* ── Infrastructure ── */}
            <section id="infrastructure" data-rd="sec" className="scroll-mt-28 border-t border-ink/10 py-14">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Infrastructure</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">
                Enterprise-grade infrastructure.
              </h2>
              <p className="mt-6">
                Wazelo is hosted on reliable cloud infrastructure with high availability, automatic backups, and network-level protection — so your team stays connected and your data stays safe, around the clock.
              </p>
              <p className="mt-4">
                Want a detailed security briefing for your procurement or compliance team? <a href="/contact" className={link}>Contact us</a>{" "}and we&apos;ll walk you through our architecture privately.
              </p>
            </section>

            {/* ── Compliance ── */}
            <section id="compliance" data-rd="sec" className="scroll-mt-28 border-t border-ink/10 pt-14">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Compliance</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">
                Built for regulated industries.
              </h2>
              <p className="mt-6">
                Wazelo is designed with compliance in mind — whether you&apos;re in healthcare, finance, or education.
              </p>
              <div className="mt-8">
                {compliance.map((c, i) => <Item key={c.title} i={i} {...c} />)}
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="tone-fixed bg-ink px-4 py-28 text-paper sm:px-6 lg:px-8 lg:py-36">
        <div data-rd="end" className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] tracking-[-0.02em]">
            Questions about <em className="text-[#f0b483]">security?</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-paper/70">
            Our team is happy to walk you through our security architecture, answer compliance questions, or provide documentation for your procurement process.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="/contact" className="group inline-flex items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper">
              Contact our team
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a href={APP_REGISTER_URL} className="inline-flex items-center rounded-full border border-paper/25 px-8 py-4 text-sm font-semibold text-paper transition-colors hover:border-paper/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper">
              Start free trial
            </a>
          </div>
        </div>
      </section>

      <SiteFooter showCta={false} />
    </div>
  );
}
