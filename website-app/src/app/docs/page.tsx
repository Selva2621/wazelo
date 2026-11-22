"use client";

import { useRef, useState } from "react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import { MobileToc } from "@/components/mobile-toc";
import SiteNavbar from "@/components/Navbar";
import { PLANS, money, num } from "@/components/pricing/plans";

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const sections = [
  { id: "getting-started",   label: "Getting Started" },
  { id: "whatsapp-setup",    label: "WhatsApp Setup" },
  { id: "shared-inbox",      label: "Shared Inbox" },
  { id: "contacts",          label: "Contacts & Tags" },
  { id: "campaigns",         label: "Campaigns" },
  { id: "automation",        label: "Automation" },
  { id: "chatbot",           label: "Chatbot Builder" },
  { id: "analytics",         label: "Analytics" },
  { id: "team-roles",        label: "Team & Roles" },
  { id: "billing",           label: "Billing & Plans" },
];

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const link = "text-rust underline decoration-rust/30 underline-offset-4 transition-colors hover:decoration-rust";

// ─── Building blocks ──────────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <pre className="tone-fixed mb-6 overflow-x-auto rounded-xl bg-ink px-5 py-4">
      <code className="font-mono text-[13px] leading-[1.7] text-paper/90">{children}</code>
    </pre>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-rd="sec" className="scroll-mt-28 border-t border-ink/10 py-14 first:border-t-0 first:pt-0">
      <h2 className="mb-6 font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-ink">{children}</h3>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mb-6 flex list-disc flex-col gap-2 pl-5 marker:text-ink-faint">{children}</ul>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-ink/10 bg-paper-deep/60 px-5 py-4">
      <span aria-hidden className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-rust">{icon}</span>
      <p className="text-[15px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 divide-y divide-ink/10 border-y border-ink/15">{children}</div>;
}

// ─── Docs Page ────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("getting-started");

  useGSAP(
    () => {
      // Table of contents: highlight the section crossing the upper third of the viewport.
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
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Documentation</p>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em]">
            Wazelo <em className="text-rust">Docs</em>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Everything you need to set up, configure, and get the most out of Wazelo for your team.
          </p>
        </div>
      </header>

      {/* Layout */}
      <div className="border-t border-ink/10 px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav data-rd="toc" aria-label="On this page" className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto">
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
              <div className="mt-8 border-t border-ink/10 pt-6">
                <a href="/api-reference" className={`inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-rust ${focusInk}`}>
                  <span aria-hidden className="material-symbols-outlined text-[16px]">api</span>
                  API Reference →
                </a>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <div className="lg:hidden"><MobileToc items={sections} /></div>
          <main data-rd="body" className="max-w-[68ch] text-[17px] leading-relaxed text-ink-soft">

            {/* ── Getting Started ── */}
            <DocSection id="getting-started" title="Getting Started">
              <P>Welcome to Wazelo. This guide walks you through creating your account, connecting your WhatsApp Business number, and sending your first message — all in under 15 minutes.</P>
              <H3>1. Create your account</H3>
              <P>Sign up at <a href={APP_REGISTER_URL} className={link}>wazelo.in/register</a>. You'll need a valid business email. No credit card is required for the 14-day free trial.</P>
              <H3>2. Set up your organisation</H3>
              <P>After signup, you'll be prompted to name your organisation and invite team members. You can skip invitations and do this later from Settings → Team.</P>
              <H3>3. Connect WhatsApp</H3>
              <P>Go to <B>Settings → WhatsApp</B> and connect a number: scan a QR code with WhatsApp on your phone, or connect an official WhatsApp Cloud API number through Meta. See the <a href="#whatsapp-setup" className={link}>WhatsApp Setup</a> section for full details.</P>
              <Callout icon="info">A QR-linked number works with your existing WhatsApp or WhatsApp Business app. An official Cloud API number needs a Meta Business account, and has no ban risk.</Callout>
            </DocSection>

            {/* ── WhatsApp Setup ── */}
            <DocSection id="whatsapp-setup" title="WhatsApp Setup">
              <P>There are two ways to connect. <B>QR code:</B> in WhatsApp on your phone go to Settings → Linked Devices → Link a Device and scan the QR code in Wazelo. <B>Official Cloud API number:</B> connect a number through Meta; the steps below are for this option.</P>
              <H3>Prerequisites (official Cloud API number)</H3>
              <Ul>
                <Li>A Facebook Business Manager account (business.facebook.com)</Li>
                <Li>A phone number not previously registered on WhatsApp (or one that's been fully deleted)</Li>
                <Li>A verified business name and website</Li>
              </Ul>
              <H3>Connection steps</H3>
              <Ul>
                <Li><B>Step 1:</B> Go to Settings → Channels → WhatsApp</Li>
                <Li><B>Step 2:</B> Click "Connect via Meta" — you'll be redirected to Meta's embedded signup flow</Li>
                <Li><B>Step 3:</B> Select your Business Manager, create or select a WhatsApp Business Account, and verify your phone number via OTP</Li>
                <Li><B>Step 4:</B> Return to Wazelo — your number will appear as Connected within 60 seconds</Li>
              </Ul>
              <Callout icon="check_circle">Once connected, your inbox goes live immediately. All inbound messages will appear in the Shared Inbox.</Callout>
              <H3>Message Templates</H3>
              <P>For outbound messages to contacts who haven't messaged you in the last 24 hours, you must use pre-approved Meta message templates. Go to <B>Settings → Templates</B> to create and submit templates for approval. Approval typically takes 5–10 minutes for standard templates.</P>
            </DocSection>

            {/* ── Shared Inbox ── */}
            <DocSection id="shared-inbox" title="Shared Inbox">
              <P>The Shared Inbox is the core of Wazelo. Every inbound WhatsApp message from any contact lands here, visible to your whole team.</P>
              <H3>Conversation assignment</H3>
              <P>Conversations can be assigned manually or automatically via routing rules. To assign manually, open a conversation and click <B>Assign</B> in the top-right panel. To set up auto-routing, go to <B>Settings → Routing</B>.</P>
              <H3>Conversation statuses</H3>
              <Ul>
                <Li><B>Open</B> — active conversation requiring attention</Li>
                <Li><B>Pending</B> — waiting for customer reply</Li>
                <Li><B>Resolved</B> — marked done, removed from active queue</Li>
                <Li><B>Snoozed</B> — hidden until a specified time</Li>
              </Ul>
              <H3>Internal notes</H3>
              <P>Use the <B>Note</B> tab in the reply box to leave internal comments visible only to your team — not sent to the customer.</P>
              <H3>Quick replies</H3>
              <P>Save frequently used messages as Quick Replies under <B>Settings → Quick Replies</B>. Access them in any conversation by typing <C>/</C> in the reply box.</P>
            </DocSection>

            {/* ── Contacts ── */}
            <DocSection id="contacts" title="Contacts & Tags">
              <P>Every phone number that messages you creates a contact profile automatically. You can also import contacts via CSV.</P>
              <H3>Importing contacts</H3>
              <P>Go to <B>Contacts → Import</B> and upload a CSV file. Required columns: <C>phone</C>. Optional: <C>name</C>, <C>email</C>, <C>tags</C>.</P>
              <Code>{`phone,name,email,tags
919876543210,Rahul Sharma,rahul@example.com,"hot-lead,mumbai"
919988776655,Priya Nair,priya@example.com,"trial-user"`}</Code>
              <H3>Tags</H3>
              <P>Tags let you segment contacts for campaigns, filtering, and automation triggers. Apply tags manually from the contact profile, or automatically via automation rules.</P>
              <H3>Custom fields</H3>
              <P>Add custom data fields to contacts under <B>Settings → Custom Fields</B>. Supported types: text, number, date, dropdown. Custom fields can be used in message personalisation using <C>{`{{field_name}}`}</C>.</P>
            </DocSection>

            {/* ── Campaigns ── */}
            <DocSection id="campaigns" title="Campaigns">
              <P>Campaigns let you send bulk WhatsApp messages to a segment of your contacts. All outbound campaign messages use approved Meta templates.</P>
              <H3>Creating a campaign</H3>
              <Ul>
                <Li>Go to <B>Campaigns → New Campaign</B></Li>
                <Li>Choose a contact segment (by tag, custom field, or all contacts)</Li>
                <Li>Select an approved message template</Li>
                <Li>Map template variables to contact fields (e.g. <C>{`{{1}}`}</C> → <C>contact.name</C>)</Li>
                <Li>Schedule or send immediately</Li>
              </Ul>
              <H3>Campaign analytics</H3>
              <P>After sending, track <B>Sent → Delivered → Read → Replied</B> in real time from the campaign detail screen. Replies automatically open conversations in the Shared Inbox.</P>
              <Callout icon="warning">Meta enforces rate limits on campaign messages. Wazelo handles queuing and retry automatically — do not send the same campaign twice.</Callout>
            </DocSection>

            {/* ── Automation ── */}
            <DocSection id="automation" title="Automation">
              <P>Automation workflows let you send messages, update contact data, assign conversations, and more — automatically, based on triggers and conditions.</P>
              <H3>Triggers</H3>
              <Ul>
                <Li><B>Inbound message</B> — fires when a contact sends a message matching a keyword or pattern</Li>
                <Li><B>Contact tag added</B> — fires when a specific tag is applied to a contact</Li>
                <Li><B>Conversation resolved</B> — fires when an agent resolves a conversation</Li>
                <Li><B>Time delay</B> — fires X hours/days after a previous action</Li>
                <Li><B>Campaign reply</B> — fires when a contact replies to a specific campaign</Li>
              </Ul>
              <H3>Actions</H3>
              <Ul>
                <Li>Send a WhatsApp message (template or freeform within 24h window)</Li>
                <Li>Add or remove a contact tag</Li>
                <Li>Update a contact custom field</Li>
                <Li>Assign conversation to an agent or team</Li>
                <Li>Send a webhook to an external URL</Li>
              </Ul>
              <H3>Example: post-site-visit follow-up</H3>
              <Code>{`Trigger: Tag "site-visit" added to contact
├── Action: Send message "Thanks for visiting! Here's our brochure..."
├── Wait: 2 days
├── Action: Send message "Any questions? We'd love to help."
└── Wait: 5 days
    └── Action: Send message "Last chance — offer valid until Friday!"`}</Code>
            </DocSection>

            {/* ── Chatbot ── */}
            <DocSection id="chatbot" title="Chatbot Builder">
              <P>Build no-code WhatsApp chatbot flows using the visual builder. Chatbots can qualify leads, answer FAQs, collect information, and hand off to a human agent.</P>
              <H3>Flow structure</H3>
              <Ul>
                <Li><B>Start node</B> — defines when the bot activates (first message, keyword, outside hours)</Li>
                <Li><B>Message node</B> — sends a text, image, or button message to the user</Li>
                <Li><B>Question node</B> — asks a question and saves the reply to a contact field</Li>
                <Li><B>Condition node</B> — branches the flow based on contact field values or keywords</Li>
                <Li><B>Handoff node</B> — transfers the conversation to a human agent</Li>
              </Ul>
              <H3>Button messages</H3>
              <P>Use button messages (up to 3 buttons) for guided flows. When the user taps a button, the bot follows the corresponding branch automatically.</P>
              <Callout icon="smart_toy">Chatbots only run within the 24-hour messaging window. For re-engagement after 24 hours, use Campaigns with approved templates instead.</Callout>
            </DocSection>

            {/* ── Analytics ── */}
            <DocSection id="analytics" title="Analytics">
              <P>The Analytics dashboard gives you a real-time view of team performance, conversation volumes, response times, and campaign results.</P>
              <H3>Key metrics</H3>
              <Ul>
                <Li><B>First response time</B> — average time from inbound message to first agent reply</Li>
                <Li><B>Resolution time</B> — average time from conversation open to resolved</Li>
                <Li><B>CSAT score</B> — customer satisfaction rating collected via automated post-resolution survey</Li>
                <Li><B>Agent leaderboard</B> — conversations handled and resolution rate per agent</Li>
                <Li><B>Campaign funnel</B> — sent → delivered → read → replied per campaign</Li>
              </Ul>
              <H3>Date filters</H3>
              <P>All reports support date range filtering: today, last 7 days, last 30 days, or a custom range. Filter by agent, team, or conversation tag using the filter bar.</P>
            </DocSection>

            {/* ── Team & Roles ── */}
            <DocSection id="team-roles" title="Team & Roles">
              <P>Invite team members from <B>Settings → Team</B>. Each member is assigned a role that controls their access level.</P>
              <H3>Roles</H3>
              <Rows>
                {[
                  ["Admin", "Full access — settings, billing, all conversations, reports"],
                  ["Manager", "View all conversations, reports, and team management. Cannot change billing."],
                  ["Agent", "Access only to assigned conversations and their own performance stats"],
                ].map(([role, desc]) => (
                  <div key={role} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                    <span className="shrink-0 text-[15px] font-semibold text-ink sm:w-24">{role}</span>
                    <span className="text-[15px] leading-relaxed">{desc}</span>
                  </div>
                ))}
              </Rows>
              <H3>Invitation</H3>
              <P>Invite members by email. They'll receive a signup link valid for 48 hours. Pending invitations can be resent or cancelled from the Team settings page.</P>
            </DocSection>

            {/* ── Billing ── */}
            <DocSection id="billing" title="Billing & Plans">
              <P>Wazelo is billed monthly or annually. All plans include a 14-day free trial. Prices are in US dollars, or rupees in India. See <B>Pricing</B> for every limit.</P>
              <H3>Plans</H3>
              <Rows>
                {PLANS.map((p) => [
                  p.name,
                  `${money(p.price.USD, "USD")}/mo`,
                  `${p.users} ${p.users === 1 ? "user" : "users"}, ${num(p.messages)} messages/mo (${money(p.price.INR, "INR")}/mo in India)`,
                ]).map(([plan, price, desc]) => (
                  <div key={plan} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4">
                    <span className="w-24 shrink-0 text-[15px] font-semibold text-ink">{plan}</span>
                    <span className="w-28 shrink-0 font-display text-2xl leading-none text-ink tabular-nums">{price}</span>
                    <span className="text-[15px] leading-relaxed">{desc}</span>
                  </div>
                ))}
              </Rows>
              <H3>Upgrading or downgrading</H3>
              <P>Upgrades take effect immediately and are prorated. Downgrades apply at the end of the current billing period. Manage your plan from <B>Settings → Billing</B>.</P>
              <H3>Cancellation</H3>
              <P>Cancel anytime from Settings → Billing. Your account remains active until the end of the current billing period, and you can reactivate before then. Payments already made are not refunded; an extra or duplicate payment adds another prepaid period. A payment that was taken but not added to your plan is fixed by our support team, or refunded if it can't be added.</P>
              <H3>Renewing</H3>
              <P>Plans are prepaid and never charged automatically. Wazelo reminds you 3 days and 1 day before your plan ends (in the app, by email and on WhatsApp). Renew with <B>Renew now</B> in Settings → Billing; paying early adds the new period after the current one, so you don't lose days, and you can pay several periods ahead. If the period ends unpaid, your plan pauses that day and your data is kept: pay to continue straight away.</P>
            </DocSection>

          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
