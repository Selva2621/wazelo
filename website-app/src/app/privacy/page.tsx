"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import { MobileToc } from "@/components/mobile-toc";
import SiteNavbar from "@/components/Navbar";

// ─── Table of contents ───────────────────────────────────────────────────────
const sections = [
  { id: "introduction",   title: "1. Introduction" },
  { id: "information",    title: "2. Information We Collect" },
  { id: "use",            title: "3. How We Use Your Information" },
  { id: "storage",        title: "4. Data Storage & Security" },
  { id: "retention",      title: "5. Data Retention" },
  { id: "sharing",        title: "6. Sharing of Information" },
  { id: "cookies",        title: "7. Cookies & Tracking" },
  { id: "rights",         title: "8. Your Rights" },
  { id: "children",       title: "9. Children's Privacy" },
  { id: "changes",        title: "10. Changes to This Policy" },
  { id: "contact",        title: "11. Contact Us" },
] as const;

type SectionId = (typeof sections)[number]["id"];

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const link = "text-rust underline decoration-rust/30 underline-offset-4 transition-colors hover:decoration-rust";

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const title = sections.find((s) => s.id === id)!.title;
  return (
    <section id={id} data-rd="sec" className="scroll-mt-28 border-t border-ink/10 py-12 first:border-t-0 first:pt-0">
      <h2 className="mb-5 font-display text-3xl leading-[1.1] tracking-[-0.01em] text-ink md:text-4xl">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mb-4 flex list-disc flex-col gap-2 pl-5 marker:text-ink-faint">{children}</ul>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

/** "1. Introduction" → number + label for the TOC. */
function splitTitle(t: string) {
  const m = t.match(/^(\d+)\.\s(.*)$/);
  return m ? { n: m[1].padStart(2, "0"), label: m[2] } : { n: "", label: t };
}

// ─── Privacy Page ─────────────────────────────────────────────────────────────
export default function PrivacyPage() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(sections[0].id);

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
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar />

      {/* Hero */}
      <header className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
        <div data-rd="head" className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Legal</p>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em]">
            Privacy <em className="text-rust">Policy</em>
          </h1>
          <p className="mt-6 font-mono text-xs text-ink-faint">
            Last updated: April 19, 2025 · Effective for all Wazelo users
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="border-t border-ink/10 px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">

          <aside className="hidden lg:block">
            <nav data-rd="toc" aria-label="On this page" className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">On this page</p>
              <ol className="mt-5 flex flex-col border-l border-ink/10">
                {sections.map((s) => {
                  const { n, label } = splitTitle(s.title);
                  const on = active === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={() => setActive(s.id)}
                        aria-current={on ? "location" : undefined}
                        className={`-ml-px flex gap-3 border-l py-1.5 pl-4 text-sm transition-colors ${focusInk} ${on ? "border-rust font-medium text-rust" : "border-transparent text-ink-soft hover:text-ink"}`}
                      >
                        <span className={`w-5 shrink-0 font-mono text-[11px] leading-5 ${on ? "text-rust" : "text-ink-faint"}`}>{n}</span>
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <div className="lg:hidden"><MobileToc items={sections.map((s) => ({ id: s.id, label: s.title }))} /></div>

          <main data-rd="body" className="max-w-[68ch] text-[17px] leading-relaxed text-ink-soft">

            <Section id="introduction">
              <P>Wazelo ("we", "our", or "us") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, store, and share information when you use our platform at wazelo.in and its related services (collectively, the "Service").</P>
              <P>By using Wazelo, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.</P>
            </Section>

            <Section id="information">
              <P>We collect the following categories of information:</P>
              <Ul>
                <Li><B>Account information:</B> Name, email address, phone number, company name, and password when you register.</Li>
                <Li><B>WhatsApp Business data:</B> Your WhatsApp Business Account ID, phone number linked to the Meta Business API, and message templates.</Li>
                <Li><B>Contact data:</B> Information about your customers and leads that you import or that is captured through conversations.</Li>
                <Li><B>Message content:</B> WhatsApp message content transmitted through the platform for the purpose of delivering the Service.</Li>
                <Li><B>Usage data:</B> Pages visited, features used, session duration, IP address, browser type, and device identifiers.</Li>
                <Li><B>Billing data:</B> Payment details processed securely through our payment provider (Stripe / Razorpay). We do not store full card numbers.</Li>
              </Ul>
            </Section>

            <Section id="use">
              <P>We use the information we collect to:</P>
              <Ul>
                <Li>Provide, maintain, and improve the Wazelo platform</Li>
                <Li>Process transactions and send billing-related communications</Li>
                <Li>Send service updates, security alerts, and support messages</Li>
                <Li>Analyse usage patterns to improve features and performance</Li>
                <Li>Comply with legal obligations and enforce our Terms of Service</Li>
                <Li>Respond to customer support requests</Li>
              </Ul>
              <P>We do not sell your personal data or your customers' data to third parties. We do not use message content for advertising purposes.</P>
            </Section>

            <Section id="storage">
              <P>All data is stored on servers located in India or within AWS regions compliant with Indian data localisation guidelines. We use industry-standard security measures including:</P>
              <Ul>
                <Li>TLS 1.2+ encryption for all data in transit</Li>
                <Li>AES-256 encryption for sensitive data at rest</Li>
                <Li>Role-based access controls limiting internal data access</Li>
                <Li>Regular security audits and vulnerability assessments</Li>
              </Ul>
              <P>While we take all reasonable steps to protect your data, no method of transmission over the internet is 100% secure.</P>
            </Section>

            <Section id="retention">
              <P>We retain your account data for as long as your account is active, or as needed to provide you with the Service. If you close your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it for legal or tax compliance purposes.</P>
              <P>Message logs may be retained for up to 90 days for debugging and compliance purposes, after which they are permanently deleted.</P>
            </Section>

            <Section id="sharing">
              <P>We may share your information with:</P>
              <Ul>
                <Li><B>Meta Platforms:</B> To deliver WhatsApp messages via the WhatsApp Business API, as required by Meta's terms.</Li>
                <Li><B>Payment processors:</B> Stripe or Razorpay, for processing subscription payments securely.</Li>
                <Li><B>Infrastructure providers:</B> AWS for hosting and storage, subject to data processing agreements.</Li>
                <Li><B>Legal requirements:</B> When required by law, court order, or government authority.</Li>
              </Ul>
              <P>All third-party processors are bound by data processing agreements and are prohibited from using your data for their own purposes.</P>
            </Section>

            <Section id="cookies">
              <P>We use cookies and similar tracking technologies to maintain sessions, remember preferences, and analyse platform usage. You can control cookie settings through your browser. Disabling cookies may affect certain features of the Service.</P>
              <P>We use analytics tools (such as PostHog or similar) to understand how users interact with the platform. This data is aggregated and anonymised.</P>
            </Section>

            <Section id="rights">
              <P>Depending on your jurisdiction, you may have the right to:</P>
              <Ul>
                <Li>Access the personal data we hold about you</Li>
                <Li>Request correction of inaccurate data</Li>
                <Li>Request deletion of your data ("right to be forgotten")</Li>
                <Li>Object to or restrict processing of your data</Li>
                <Li>Data portability — receive your data in a machine-readable format</Li>
              </Ul>
              <P>To exercise any of these rights, email us at <a href="mailto:privacy@wazelo.in" className={link}>privacy@wazelo.in</a>. We will respond within 30 days.</P>
            </Section>

            <Section id="children">
              <P>Wazelo is not directed at children under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal data, contact us and we will delete it promptly.</P>
            </Section>

            <Section id="changes">
              <P>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a prominent notice in the platform. Continued use of the Service after changes constitutes your acceptance of the updated policy.</P>
            </Section>

            <Section id="contact">
              <P>For privacy-related questions or requests, contact us at:</P>
              <div className="rounded-xl border border-ink/15 bg-card/50 px-6 py-5 text-[15px]">
                <p className="mb-1 font-semibold text-ink">Wazelo</p>
                <p className="mb-1">Email: <a href="mailto:privacy@wazelo.in" className={link}>privacy@wazelo.in</a></p>
                <p>Website: <a href="https://wazelo.in" className={link}>wazelo.in</a></p>
              </div>
            </Section>

          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
