"use client";

import { useState, useEffect } from "react";
import { useBreakpoint, APP_REGISTER_URL } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

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

// ─── Code block ───────────────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <pre style={{ background: "#111", border: "1px solid rgba(255,183,125,0.1)", borderRadius: 8, padding: "16px 20px", overflowX: "auto", marginBottom: 20 }}>
      <code style={{ fontSize: 13, color: "#a3defe", fontFamily: "'Courier New', monospace", lineHeight: 1.7 }}>{children}</code>
    </pre>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function DocSection({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 64, scrollMarginTop: 88 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: "#ffb77d", border: "1px solid rgba(255,183,125,0.3)", borderRadius: 100, padding: "2px 10px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>{badge}</span>}
      </div>
      <div style={{ width: 40, height: 2, background: "linear-gradient(to right,#ffb77d,transparent)", marginBottom: 24, borderRadius: 2 }} />
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 10, marginTop: 28 }}>{children}</h3>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 6, paddingLeft: 4 }}>{children}</li>;
}

function Callout({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#1c1b1b", borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <p style={{ fontSize: 14, color: "rgba(219,194,176,0.7)", lineHeight: 1.75, fontFamily: "'Inter', sans-serif", margin: 0 }}>{children}</p>
    </div>
  );
}

// ─── Docs Page ───────────────────────────────────────────────────────────��────
export default function DocsPage() {
  const { mobile } = useBreakpoint();
  const [active, setActive] = useState("getting-started");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* Hero */}
      <div style={{ background: "#131313", borderBottom: "1px solid rgba(255,183,125,0.06)", padding: mobile ? "100px 20px 48px" : "100px 48px 56px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Documentation</span>
          </div>
          <h1 style={{ fontSize: mobile ? "clamp(28px,7vw,44px)" : "clamp(32px,3.5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
            Wazelo CRM Docs
          </h1>
          <p style={{ fontSize: 16, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif", maxWidth: 560 }}>
            Everything you need to set up, configure, and get the most out of Wazelo CRM for your team.
          </p>
        </div>
      </div>

      {/* Layout */}
      <div style={{ background: "var(--bg)", maxWidth: 1200, margin: "0 auto", padding: mobile ? "0" : "0 48px", display: "flex", gap: 0, minHeight: "80vh" }}>

        {/* Sidebar */}
        {!mobile && (
          <aside style={{ width: 220, flexShrink: 0, paddingTop: 40, paddingRight: 32, position: "sticky", top: 64, alignSelf: "flex-start", height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(219,194,176,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>On this page</p>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} style={{
                display: "block", padding: "7px 12px", borderRadius: 6, marginBottom: 2,
                fontSize: 13, fontFamily: "'Inter', sans-serif", textDecoration: "none",
                fontWeight: active === s.id ? 600 : 400,
                color: active === s.id ? "#ffb77d" : "rgba(219,194,176,0.5)",
                background: active === s.id ? "rgba(255,183,125,0.07)" : "transparent",
                borderLeft: active === s.id ? "2px solid #ffb77d" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{s.label}</a>
            ))}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,183,125,0.08)" }}>
              <a href="/api-reference" style={{ fontSize: 13, color: "#ffb77d", fontFamily: "'Inter', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>api</span>
                API Reference →
              </a>
            </div>
          </aside>
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: mobile ? "40px 20px 80px" : "40px 0 100px 40px", borderLeft: mobile ? "none" : "1px solid rgba(255,183,125,0.06)", minWidth: 0 }}>

          {/* ── Getting Started ── */}
          <DocSection id="getting-started" title="Getting Started">
            <P>Welcome to Wazelo CRM. This guide walks you through creating your account, connecting your WhatsApp Business number, and sending your first message — all in under 15 minutes.</P>
            <H3>1. Create your account</H3>
            <P>Sign up at <a href={APP_REGISTER_URL} style={{ color: "#ffb77d", textDecoration: "none" }}>wazelo.in/register</a>. You'll need a valid business email. No credit card is required for the 14-day free trial.</P>
            <H3>2. Set up your organisation</H3>
            <P>After signup, you'll be prompted to name your organisation and invite team members. You can skip invitations and do this later from Settings → Team.</P>
            <H3>3. Connect WhatsApp</H3>
            <P>Go to <strong style={{ color: "#e5e2e1" }}>Settings → WhatsApp</strong> and follow the guided flow to connect your WhatsApp Business API number via Meta. See the <a href="#whatsapp-setup" style={{ color: "#ffb77d", textDecoration: "none" }}>WhatsApp Setup</a> section for full details.</P>
            <Callout icon="info" color="#ffb77d">You need a WhatsApp Business API account (via Meta Business Manager) to use Wazelo CRM. Personal WhatsApp numbers are not supported.</Callout>
          </DocSection>

          {/* ── WhatsApp Setup ── */}
          <DocSection id="whatsapp-setup" title="WhatsApp Setup">
            <P>Wazelo CRM uses the official Meta WhatsApp Business API. You'll need a Meta Business Manager account and a verified phone number.</P>
            <H3>Prerequisites</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li>A Facebook Business Manager account (business.facebook.com)</Li>
              <Li>A phone number not previously registered on WhatsApp (or one that's been fully deleted)</Li>
              <Li>A verified business name and website</Li>
            </ul>
            <H3>Connection steps</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "#e5e2e1" }}>Step 1:</strong> Go to Settings → Channels → WhatsApp</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Step 2:</strong> Click "Connect via Meta" — you'll be redirected to Meta's embedded signup flow</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Step 3:</strong> Select your Business Manager, create or select a WhatsApp Business Account, and verify your phone number via OTP</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Step 4:</strong> Return to Wazelo CRM — your number will appear as Connected within 60 seconds</Li>
            </ul>
            <Callout icon="check_circle" color="#86efac">Once connected, your inbox goes live immediately. All inbound messages will appear in the Shared Inbox.</Callout>
            <H3>Message Templates</H3>
            <P>For outbound messages to contacts who haven't messaged you in the last 24 hours, you must use pre-approved Meta message templates. Go to <strong style={{ color: "#e5e2e1" }}>Settings → Templates</strong> to create and submit templates for approval. Approval typically takes 5–10 minutes for standard templates.</P>
          </DocSection>

          {/* ── Shared Inbox ── */}
          <DocSection id="shared-inbox" title="Shared Inbox">
            <P>The Shared Inbox is the core of Wazelo CRM. Every inbound WhatsApp message from any contact lands here, visible to your whole team.</P>
            <H3>Conversation assignment</H3>
            <P>Conversations can be assigned manually or automatically via routing rules. To assign manually, open a conversation and click <strong style={{ color: "#e5e2e1" }}>Assign</strong> in the top-right panel. To set up auto-routing, go to <strong style={{ color: "#e5e2e1" }}>Settings → Routing</strong>.</P>
            <H3>Conversation statuses</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "#ffb77d" }}>Open</strong> — active conversation requiring attention</Li>
              <Li><strong style={{ color: "#a3defe" }}>Pending</strong> — waiting for customer reply</Li>
              <Li><strong style={{ color: "#86efac" }}>Resolved</strong> — marked done, removed from active queue</Li>
              <Li><strong style={{ color: "rgba(219,194,176,0.5)" }}>Snoozed</strong> — hidden until a specified time</Li>
            </ul>
            <H3>Internal notes</H3>
            <P>Use the <strong style={{ color: "#e5e2e1" }}>Note</strong> tab in the reply box to leave internal comments visible only to your team — not sent to the customer.</P>
            <H3>Quick replies</H3>
            <P>Save frequently used messages as Quick Replies under <strong style={{ color: "#e5e2e1" }}>Settings → Quick Replies</strong>. Access them in any conversation by typing <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>/</code> in the reply box.</P>
          </DocSection>

          {/* ── Contacts ── */}
          <DocSection id="contacts" title="Contacts & Tags">
            <P>Every phone number that messages you creates a contact profile automatically. You can also import contacts via CSV.</P>
            <H3>Importing contacts</H3>
            <P>Go to <strong style={{ color: "#e5e2e1" }}>Contacts → Import</strong> and upload a CSV file. Required columns: <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>phone</code>. Optional: <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>name</code>, <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>email</code>, <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>tags</code>.</P>
            <Code>{`phone,name,email,tags
919876543210,Rahul Sharma,rahul@example.com,"hot-lead,mumbai"
919988776655,Priya Nair,priya@example.com,"trial-user"`}</Code>
            <H3>Tags</H3>
            <P>Tags let you segment contacts for campaigns, filtering, and automation triggers. Apply tags manually from the contact profile, or automatically via automation rules.</P>
            <H3>Custom fields</H3>
            <P>Add custom data fields to contacts under <strong style={{ color: "#e5e2e1" }}>Settings → Custom Fields</strong>. Supported types: text, number, date, dropdown. Custom fields can be used in message personalisation using <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>{`{{field_name}}`}</code>.</P>
          </DocSection>

          {/* ── Campaigns ── */}
          <DocSection id="campaigns" title="Campaigns">
            <P>Campaigns let you send bulk WhatsApp messages to a segment of your contacts. All outbound campaign messages use approved Meta templates.</P>
            <H3>Creating a campaign</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li>Go to <strong style={{ color: "#e5e2e1" }}>Campaigns → New Campaign</strong></Li>
              <Li>Choose a contact segment (by tag, custom field, or all contacts)</Li>
              <Li>Select an approved message template</Li>
              <Li>Map template variables to contact fields (e.g. <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>{`{{1}}`}</code> → <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>contact.name</code>)</Li>
              <Li>Schedule or send immediately</Li>
            </ul>
            <H3>Campaign analytics</H3>
            <P>After sending, track <strong style={{ color: "#e5e2e1" }}>Sent → Delivered → Read → Replied</strong> in real time from the campaign detail screen. Replies automatically open conversations in the Shared Inbox.</P>
            <Callout icon="warning" color="#fbbf24">Meta enforces rate limits on campaign messages. Wazelo CRM handles queuing and retry automatically — do not send the same campaign twice.</Callout>
          </DocSection>

          {/* ── Automation ── */}
          <DocSection id="automation" title="Automation">
            <P>Automation workflows let you send messages, update contact data, assign conversations, and more — automatically, based on triggers and conditions.</P>
            <H3>Triggers</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "#e5e2e1" }}>Inbound message</strong> — fires when a contact sends a message matching a keyword or pattern</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Contact tag added</strong> — fires when a specific tag is applied to a contact</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Conversation resolved</strong> — fires when an agent resolves a conversation</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Time delay</strong> — fires X hours/days after a previous action</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Campaign reply</strong> — fires when a contact replies to a specific campaign</Li>
            </ul>
            <H3>Actions</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li>Send a WhatsApp message (template or freeform within 24h window)</Li>
              <Li>Add or remove a contact tag</Li>
              <Li>Update a contact custom field</Li>
              <Li>Assign conversation to an agent or team</Li>
              <Li>Send a webhook to an external URL</Li>
            </ul>
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
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "#e5e2e1" }}>Start node</strong> — defines when the bot activates (first message, keyword, outside hours)</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Message node</strong> — sends a text, image, or button message to the user</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Question node</strong> — asks a question and saves the reply to a contact field</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Condition node</strong> — branches the flow based on contact field values or keywords</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Handoff node</strong> — transfers the conversation to a human agent</Li>
            </ul>
            <H3>Button messages</H3>
            <P>Use button messages (up to 3 buttons) for guided flows. When the user taps a button, the bot follows the corresponding branch automatically.</P>
            <Callout icon="smart_toy" color="#a3defe">Chatbots only run within the 24-hour messaging window. For re-engagement after 24 hours, use Campaigns with approved templates instead.</Callout>
          </DocSection>

          {/* ── Analytics ── */}
          <DocSection id="analytics" title="Analytics">
            <P>The Analytics dashboard gives you a real-time view of team performance, conversation volumes, response times, and campaign results.</P>
            <H3>Key metrics</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "#e5e2e1" }}>First response time</strong> — average time from inbound message to first agent reply</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Resolution time</strong> — average time from conversation open to resolved</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>CSAT score</strong> — customer satisfaction rating collected via automated post-resolution survey</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Agent leaderboard</strong> — conversations handled and resolution rate per agent</Li>
              <Li><strong style={{ color: "#e5e2e1" }}>Campaign funnel</strong> — sent → delivered → read → replied per campaign</Li>
            </ul>
            <H3>Date filters</H3>
            <P>All reports support date range filtering: today, last 7 days, last 30 days, or a custom range. Filter by agent, team, or conversation tag using the filter bar.</P>
          </DocSection>

          {/* ── Team & Roles ── */}
          <DocSection id="team-roles" title="Team & Roles">
            <P>Invite team members from <strong style={{ color: "#e5e2e1" }}>Settings → Team</strong>. Each member is assigned a role that controls their access level.</P>
            <H3>Roles</H3>
            <div style={{ background: "#1c1b1b", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                ["Admin", "Full access — settings, billing, all conversations, reports"],
                ["Manager", "View all conversations, reports, and team management. Cannot change billing."],
                ["Agent", "Access only to assigned conversations and their own performance stats"],
              ].map(([role, desc], i) => (
                <div key={role} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: i < 2 ? "1px solid rgba(255,183,125,0.06)" : "none", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ffb77d", fontFamily: "'Inter', sans-serif", minWidth: 72, paddingTop: 1 }}>{role}</span>
                  <span style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>{desc}</span>
                </div>
              ))}
            </div>
            <H3>Invitation</H3>
            <P>Invite members by email. They'll receive a signup link valid for 48 hours. Pending invitations can be resent or cancelled from the Team settings page.</P>
          </DocSection>

          {/* ── Billing ── */}
          <DocSection id="billing" title="Billing & Plans">
            <P>Wazelo CRM is billed monthly or annually. All plans include a 14-day free trial.</P>
            <H3>Plans</H3>
            <div style={{ background: "#1c1b1b", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                ["Starter", "₹499/mo", "Up to 3 agents, 5,000 messages/mo"],
                ["Growth", "₹999/mo", "Up to 10 agents, 25,000 messages/mo"],
                ["Pro", "₹1,999/mo", "Unlimited agents, 100,000 messages/mo"],
              ].map(([plan, price, desc], i) => (
                <div key={plan} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: i < 2 ? "1px solid rgba(255,183,125,0.06)" : "none", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ffb77d", fontFamily: "'Inter', sans-serif", minWidth: 72 }}>{plan}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", minWidth: 90 }}>{price}</span>
                  <span style={{ fontSize: 13, color: "rgba(219,194,176,0.6)", fontFamily: "'Inter', sans-serif" }}>{desc}</span>
                </div>
              ))}
            </div>
            <H3>Upgrading or downgrading</H3>
            <P>Plan changes take effect immediately. Upgrades are prorated; downgrades apply at the next billing cycle. Manage your plan from <strong style={{ color: "#e5e2e1" }}>Settings → Billing</strong>.</P>
            <H3>Cancellation</H3>
            <P>Cancel anytime from Settings → Billing. Your account remains active until the end of the current billing period. No refunds are issued for partial months.</P>
          </DocSection>

        </main>
      </div>

      <SiteFooter />
    </>
  );
}
