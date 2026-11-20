"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import { MobileToc } from "@/components/mobile-toc";
import SiteNavbar from "@/components/Navbar";

// ─── Table of contents ───────────────────────────────────────────────────────
const sections = [
  { id: "acceptance",    title: "1. Acceptance of Terms" },
  { id: "service",       title: "2. Description of Service" },
  { id: "account",       title: "3. Account Registration" },
  { id: "acceptable-use", title: "4. Acceptable Use" },
  { id: "whatsapp",      title: "5. WhatsApp Business API Compliance" },
  { id: "lead-finder",   title: "6. Lead Finder" },
  { id: "billing",       title: "7. Subscription & Billing" },
  { id: "trial",         title: "8. Free Trial" },
  { id: "ip",            title: "9. Intellectual Property" },
  { id: "privacy",       title: "10. Data & Privacy" },
  { id: "liability",     title: "11. Limitation of Liability" },
  { id: "indemnification", title: "12. Indemnification" },
  { id: "termination",   title: "13. Termination" },
  { id: "law",           title: "14. Governing Law" },
  { id: "changes",       title: "15. Changes to Terms" },
  { id: "contact",       title: "16. Contact Us" },
] as const;

type SectionId = (typeof sections)[number]["id"];

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const link = "text-rust underline decoration-rust/30 underline-offset-4 transition-colors hover:decoration-rust";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

/** "1. Acceptance of Terms" → number + label for the TOC. */
function splitTitle(t: string) {
  const m = t.match(/^(\d+)\.\s(.*)$/);
  return m ? { n: m[1].padStart(2, "0"), label: m[2] } : { n: "", label: t };
}

// ─── Terms Page ──────────────────────────────────────────────────────────────
export default function TermsPage() {
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
            Terms of <em className="text-rust">Service</em>
          </h1>
          <p className="mt-6 font-mono text-xs text-ink-faint">
            Last updated: November 19, 2026 · Effective for all Wazelo users
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="border-t border-ink/10 px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">

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

            <Section id="acceptance">
              <P>By accessing or using Wazelo ("Service"), operated by Wazelo ("we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of a business or organisation, you represent that you have the authority to bind that entity to these Terms.</P>
              <P>If you do not agree to these Terms, do not use the Service.</P>
            </Section>

            <Section id="service">
              <P>Wazelo provides a WhatsApp Business API-based customer relationship management platform including a shared inbox, contact management, bulk campaign broadcasting, automation workflows, chatbot builder, and analytics dashboard. The Service is accessed via wazelo.in and its subdomains.</P>
              <P>We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice to active subscribers.</P>
            </Section>

            <Section id="account">
              <P>To use the Service, you must create an account with accurate information. You are responsible for:</P>
              <Ul>
                <Li>Maintaining the confidentiality of your account credentials</Li>
                <Li>All activity that occurs under your account</Li>
                <Li>Notifying us immediately of any unauthorised access at <a href="mailto:support@wazelo.in" className={link}>support@wazelo.in</a></Li>
              </Ul>
              <P>One account may not be shared across multiple organisations. Each organisation must maintain its own account.</P>
            </Section>

            <Section id="acceptable-use">
              <P>You agree to use the Service only for lawful purposes and in accordance with Meta's WhatsApp Business Policy. You must not:</P>
              <Ul>
                <Li>Send unsolicited bulk messages (spam) to contacts who have not opted in</Li>
                <Li>Use the platform to harass, threaten, or deceive any person</Li>
                <Li>Transmit malware, viruses, or any harmful code</Li>
                <Li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</Li>
                <Li>Resell, sublicense, or white-label the Service without a written agreement with us</Li>
                <Li>Use the Service in any way that violates applicable Indian or international laws</Li>
              </Ul>
              <P>We reserve the right to suspend or terminate any account found to be in violation of these terms without prior notice.</P>
            </Section>

            <Section id="whatsapp">
              <P>You acknowledge that the Service is built on Meta's WhatsApp Business API and that your use must comply with Meta's Business Policy, Commerce Policy, and WhatsApp's terms at all times. You are solely responsible for:</P>
              <Ul>
                <Li>Obtaining proper opt-in consent from all contacts before messaging them</Li>
                <Li>Ensuring your message templates comply with Meta's template guidelines</Li>
                <Li>Any penalties, restrictions, or bans imposed by Meta on your WhatsApp Business Account</Li>
              </Ul>
            </Section>

            <Section id="lead-finder">
              <P>The Lead Finder collects business information that is publicly listed on third-party websites, such as Google Maps, IndiaMART, job boards and businesses' own websites. We run the search for you; you decide which leads to keep, contact and store. For the personal data you collect and use this way, you are the data fiduciary (data controller) under the Digital Personal Data Protection Act, 2023 and other applicable law, and Wazelo acts on your instructions.</P>
              <P>When you use the Lead Finder, you are solely responsible for:</P>
              <Ul>
                <Li>Having a lawful reason to collect, store and contact each lead, and using their data only for that purpose</Li>
                <Li>Getting opt-in consent before you message a lead on WhatsApp or send them marketing. A number found by the Lead Finder is not consent</Li>
                <Li>Following the terms of the websites the data comes from, and any limits they set on how it may be used</Li>
                <Li>Following the TRAI telemarketing rules, the Do Not Disturb (DND) registry and similar rules when you call or message leads</Li>
                <Li>Stopping contact and deleting a person's data promptly when they ask, and keeping it only as long as you need it</Li>
                <Li>Any complaint, claim, penalty or WhatsApp account restriction that results from how you collect or use leads</Li>
              </Ul>
              <P>To help you comply, the Service may hold back WhatsApp campaigns, sequences and automations to leads that have not opted in, keep numbers that asked to be removed from being found again, and delete raw search results after a retention period. These safeguards do not move your responsibility to us.</P>
              <P>Lead data is provided "as is". We do not promise that it is accurate, complete or current, or that a source will remain available. We may limit, change or remove Lead Finder sources at any time, including when a source asks us to, and may suspend the Lead Finder for any account that misuses it.</P>
            </Section>

            <Section id="billing">
              <P>Wazelo is offered on a subscription basis. By subscribing to a paid plan, you authorise us to charge the applicable fees to your chosen payment method at the start of each billing cycle.</P>
              <Ul>
                <Li>All prices are in Indian Rupees (INR) unless stated otherwise</Li>
                <Li>Subscription fees are non-refundable except as required by law or as stated in our Refund Policy</Li>
                <Li>We may change subscription prices with 30 days' written notice to active subscribers</Li>
                <Li>Failure to pay may result in suspension of your account after a 7-day grace period</Li>
              </Ul>
            </Section>

            <Section id="trial">
              <P>We may offer a free trial period. At the end of the trial, your account will be converted to a paid subscription unless you cancel before the trial expires. No credit card is required during the trial unless explicitly stated.</P>
            </Section>

            <Section id="ip">
              <P>All content, features, and functionality of the Service — including but not limited to software, text, graphics, logos, and user interfaces — are owned by Wazelo and protected by intellectual property laws.</P>
              <P>You retain all rights to the data and content you upload to the Service. By using the Service, you grant us a limited licence to process your data solely for the purpose of providing the Service.</P>
            </Section>

            <Section id="privacy">
              <P>Your use of the Service is also governed by our <a href="/privacy" className={link}>Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to the practices described therein.</P>
            </Section>

            <Section id="liability">
              <P>To the maximum extent permitted by applicable law, Wazelo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, including but not limited to loss of revenue, data, goodwill, or business opportunities.</P>
              <P>Our total cumulative liability to you for any claims arising under these Terms shall not exceed the amount you paid us in the 3 months preceding the claim.</P>
            </Section>

            <Section id="indemnification">
              <P>You agree to indemnify, defend, and hold harmless Wazelo and its officers, directors, employees, and agents from any claims, liabilities, damages, and expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.</P>
            </Section>

            <Section id="termination">
              <P>You may cancel your account at any time from your billing settings. We may suspend or terminate your access immediately if you violate these Terms or if we are required to do so by law.</P>
              <P>Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination to allow for any disputes, after which it will be permanently deleted.</P>
            </Section>

            <Section id="law">
              <P>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.</P>
            </Section>

            <Section id="changes">
              <P>We may update these Terms from time to time. We will notify you of material changes by email or via an in-app notice at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated Terms.</P>
            </Section>

            <Section id="contact">
              <P>For questions about these Terms, contact us at:</P>
              <div className="rounded-xl border border-ink/15 bg-card/50 px-6 py-5 text-[15px]">
                <p className="mb-1 font-semibold text-ink">Wazelo</p>
                <p className="mb-1">Email: <a href="mailto:legal@wazelo.in" className={link}>legal@wazelo.in</a></p>
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
