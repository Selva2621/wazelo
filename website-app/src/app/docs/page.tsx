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
    <pre style={{ background: "var(--c-surface)", border: "1px solid rgb(var(--fx-accent) / 0.1)", borderRadius: 8, padding: "16px 20px", overflowX: "auto", marginBottom: 20 }}>
      <code style={{ fontSize: 13, color: "var(--c-info)", fontFamily: "'Courier New', monospace", lineHeight: 1.7 }}>{children}</code>
    </pre>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function DocSection({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 64, scrollMarginTop: 88 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-primary-container)", border: "1px solid rgb(var(--fx-accent) / 0.3)", borderRadius: 100, padding: "2px 10px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-geist-sans), sans-serif" }}>{badge}</span>}
      </div>
      <div style={{ width: 40, height: 2, background: "linear-gradient(to right,var(--c-primary-container),transparent)", marginBottom: 24, borderRadius: 2 }} />
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: "var(--c-on-surface-variant)", lineHeight: 1.85, fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 14 }}>{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 10, marginTop: 28 }}>{children}</h3>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 15, color: "var(--c-on-surface-variant)", lineHeight: 1.85, fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 6, paddingLeft: 4 }}>{children}</li>;
}

function Callout({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--c-surface-container-lowest)", borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <p style={{ fontSize: 14, color: "var(--c-on-surface-variant)", lineHeight: 1.75, fontFamily: "var(--font-geist-sans), sans-serif", margin: 0 }}>{children}</p>
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
      <div style={{ background: "var(--c-surface)", borderBottom: "1px solid rgb(var(--fx-accent) / 0.06)", padding: mobile ? "100px 20px 48px" : "100px 48px 56px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgb(var(--fx-accent) / 0.08)", border: "1px solid rgb(var(--fx-accent) / 0.2)", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-primary-container)", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-primary-container)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-geist-sans), sans-serif" }}>Documentation</span>
          </div>
          <h1 style={{ fontSize: mobile ? "clamp(28px,7vw,44px)" : "clamp(32px,3.5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 16 }}>
            Wazelo CRM Docs
          </h1>
          <p style={{ fontSize: 16, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", maxWidth: 560 }}>
            Everything you need to set up, configure, and get the most out of Wazelo CRM for your team.
          </p>
        </div>
      </div>

      {/* Layout */}
      <div style={{ background: "var(--bg)", maxWidth: 1200, margin: "0 auto", padding: mobile ? "0" : "0 48px", display: "flex", gap: 0, minHeight: "80vh" }}>

        {/* Sidebar */}
        {!mobile && (
          <aside style={{ width: 220, flexShrink: 0, paddingTop: 40, paddingRight: 32, position: "sticky", top: 64, alignSelf: "flex-start", height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-placeholder)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 12 }}>On this page</p>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} style={{
                display: "block", padding: "7px 12px", borderRadius: 6, marginBottom: 2,
                fontSize: 13, fontFamily: "var(--font-geist-sans), sans-serif", textDecoration: "none",
                fontWeight: active === s.id ? 600 : 400,
                color: active === s.id ? "var(--c-primary-container)" : "var(--c-on-surface-variant)",
                background: active === s.id ? "rgb(var(--fx-accent) / 0.07)" : "transparent",
                borderLeft: active === s.id ? "2px solid var(--c-primary-container)" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{s.label}</a>
            ))}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgb(var(--fx-accent) / 0.08)" }}>
              <a href="/api-reference" style={{ fontSize: 13, color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>api</span>
                API Reference →
              </a>
            </div>
          </aside>
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: mobile ? "40px 20px 80px" : "40px 0 100px 40px", borderLeft: mobile ? "none" : "1px solid rgb(var(--fx-accent) / 0.06)", minWidth: 0 }}>

          {/* ── Getting Started ── */}
          <DocSection id="getting-started" title="Getting Started">
            <P>Welcome to Wazelo CRM. This guide walks you through creating your account, connecting your WhatsApp number and sending your first message.</P>
            <H3>1. Create your account</H3>
            <P>Sign up at <a href={APP_REGISTER_URL} style={{ color: "var(--c-primary-container)", textDecoration: "none" }}>wazelo.in/register</a>. No credit card is required for the 14-day free trial.</P>
            <H3>2. Choose how you work</H3>
            <P>After signup, pick <strong style={{ color: "var(--c-on-surface)" }}>Team / Company</strong> or <strong style={{ color: "var(--c-on-surface)" }}>Solo / Freelancer</strong>. Your dashboard then shows a &quot;Complete your setup&quot; checklist: connect WhatsApp, add your products, create a message template and import your contacts.</P>
            <H3>3. Connect WhatsApp</H3>
            <P>Go to <strong style={{ color: "var(--c-on-surface)" }}>Settings → WhatsApp</strong>, click <strong style={{ color: "var(--c-on-surface)" }}>Connect WhatsApp</strong> and scan the QR code with your phone. See <a href="#whatsapp-setup" style={{ color: "var(--c-primary-container)", textDecoration: "none" }}>WhatsApp Setup</a> for the steps.</P>
          </DocSection>

          {/* ── WhatsApp Setup ── */}
          <DocSection id="whatsapp-setup" title="WhatsApp Setup">
            <P>Wazelo links to your existing WhatsApp number as a linked device, the same way WhatsApp Web does. Your number and chats stay on your phone.</P>
            <H3>Connection steps</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li>In Wazelo, go to <strong style={{ color: "var(--c-on-surface)" }}>Settings → WhatsApp</strong> and click <strong style={{ color: "var(--c-on-surface)" }}>Connect WhatsApp</strong>. A QR code appears with a short countdown.</Li>
              <Li>Open WhatsApp on your phone.</Li>
              <Li>Go to <strong style={{ color: "var(--c-on-surface)" }}>Settings → Linked Devices</strong>.</Li>
              <Li>Tap <strong style={{ color: "var(--c-on-surface)" }}>Link a Device</strong> and scan the QR code.</Li>
            </ul>
            <Callout icon="check_circle" color="var(--c-code-green)">When the card shows &quot;WhatsApp Connected&quot;, your inbox is live. New messages appear in the Inbox.</Callout>
            <H3>If the QR expires or the session drops</H3>
            <P>Click <strong style={{ color: "var(--c-on-surface)" }}>Refresh QR Code</strong> to get a new one. After a short drop, Wazelo reconnects by itself; if it can&apos;t, click <strong style={{ color: "var(--c-on-surface)" }}>Reconnect</strong>. You only need to scan again if you logged out from WhatsApp on your phone.</P>
            <H3>One number per user</H3>
            <P>Each user links one WhatsApp number. Your plan sets how many numbers your organisation can connect. Admins can see and disconnect every session under <strong style={{ color: "var(--c-on-surface)" }}>Admin → WA Sessions</strong>.</P>
          </DocSection>

          {/* ── Shared Inbox ── */}
          <DocSection id="shared-inbox" title="Shared Inbox">
            <P>The Shared Inbox is the core of Wazelo CRM. Every inbound WhatsApp message from any contact lands here, visible to your whole team.</P>
            <H3>Conversation assignment</H3>
            <P>Admins and managers assign a chat from the <strong style={{ color: "var(--c-on-surface)" }}>Contact Info</strong> panel (Assigned To). To assign chats automatically, create a rule under <strong style={{ color: "var(--c-on-surface)" }}>Automation</strong> with the &quot;assign&quot; action. Leads from Meta lead ads are shared round-robin.</P>
            <H3>Conversation tabs and actions</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>All, Unread, Mine</strong>: filter the conversation list.</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Close, Reopen, Archive</strong>: from the chat header.</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Labels</strong>: tag a conversation so your team can find it later.</Li>
            </ul>
            <H3>Notes</H3>
            <P>Notes live on the contact, in the <strong style={{ color: "var(--c-on-surface)" }}>Contact Info</strong> panel. They are visible to your team and never sent to the customer.</P>
            <H3>Quick replies</H3>
            <P>Type <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>/</code> in the message box to open your Quick Replies.</P>
          </DocSection>

          {/* ── Contacts ── */}
          <DocSection id="contacts" title="Contacts & Tags">
            <P>Every phone number that messages you creates a contact profile automatically. You can also import contacts via CSV.</P>
            <H3>Importing contacts</H3>
            <P>Go to <strong style={{ color: "var(--c-on-surface)" }}>Contacts → Import</strong> and upload a CSV file. Required columns: <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>phone</code>. Optional: <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>name</code>, <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>email</code>, <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>tags</code>.</P>
            <Code>{`phone,name,email,tags
919876543210,Rahul Sharma,rahul@example.com,"hot-lead,mumbai"
919988776655,Priya Nair,priya@example.com,"trial-user"`}</Code>
            <H3>Tags</H3>
            <P>Tags let you segment contacts for campaigns, filtering, and automation triggers. Apply tags manually from the contact profile, or automatically via automation rules.</P>
            <H3>Custom fields</H3>
            <P>Add custom data fields to contacts under <strong style={{ color: "var(--c-on-surface)" }}>Settings → Custom Fields</strong>. Supported types: text, number, date, dropdown. Custom fields can be used in message personalisation using <code style={{ background: "var(--c-surface-container-lowest)", padding: "1px 6px", borderRadius: 4, color: "var(--c-primary-container)", fontSize: 13 }}>{`{{field_name}}`}</code>.</P>
          </DocSection>

          {/* ── Campaigns ── */}
          <DocSection id="campaigns" title="Campaigns">
            <P>Campaigns send one message to many contacts from your connected WhatsApp number.</P>
            <H3>Creating a campaign</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li>Go to <strong style={{ color: "var(--c-on-surface)" }}>Campaigns → New Campaign</strong>.</Li>
              <Li>Write the message (text, image, video, document or audio) or pick a template.</Li>
              <Li>Choose the audience: all contacts, or filter by lead status, tags, source, products or a Lead Scraper run.</Li>
              <Li>Send now, or schedule it with a time zone.</Li>
            </ul>
            <H3>Tracking</H3>
            <P>The campaign page shows Total Recipients, Delivered, Read and Failed, with each recipient&apos;s status. You can pause, resume or cancel a running campaign. Replies arrive in the Inbox.</P>
            <Callout icon="info" color="var(--c-primary-container)">Wazelo sends campaigns in small batches with rate limits to protect your number, and retries failed messages up to three times.</Callout>
          </DocSection>

          {/* ── Automation ── */}
          <DocSection id="automation" title="Automation">
            <P>Automation workflows let you send messages, update contact data, assign conversations, and more — automatically, based on triggers and conditions.</P>
            <H3>Triggers</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Inbound message</strong> — fires when a contact sends a message matching a keyword or pattern</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Contact tag added</strong> — fires when a specific tag is applied to a contact</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Conversation resolved</strong> — fires when an agent resolves a conversation</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Time delay</strong> — fires X hours/days after a previous action</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Campaign reply</strong> — fires when a contact replies to a specific campaign</Li>
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
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Start node</strong> — defines when the bot activates (first message, keyword, outside hours)</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Message node</strong> — sends a text, image, or button message to the user</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Question node</strong> — asks a question and saves the reply to a contact field</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Condition node</strong> — branches the flow based on contact field values or keywords</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Handoff node</strong> — transfers the conversation to a human agent</Li>
            </ul>
            <H3>Button messages</H3>
            <P>Use button messages (up to 3 buttons) for guided flows. When the user taps a button, the bot follows the corresponding branch automatically.</P>
            <Callout icon="smart_toy" color="var(--c-info)">Chatbots only run within the 24-hour messaging window. For re-engagement after 24 hours, use Campaigns with approved templates instead.</Callout>
          </DocSection>

          {/* ── Analytics ── */}
          <DocSection id="analytics" title="Analytics">
            <P>The Analytics dashboard gives you a real-time view of team performance, conversation volumes, response times, and campaign results.</P>
            <H3>Key metrics</H3>
            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>First response time</strong> — average time from inbound message to first agent reply</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Resolution time</strong> — average time from conversation open to resolved</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>CSAT score</strong> — customer satisfaction rating collected via automated post-resolution survey</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Agent leaderboard</strong> — conversations handled and resolution rate per agent</Li>
              <Li><strong style={{ color: "var(--c-on-surface)" }}>Campaign funnel</strong> — sent → delivered → read → replied per campaign</Li>
            </ul>
            <H3>Date filters</H3>
            <P>All reports support date range filtering: today, last 7 days, last 30 days, or a custom range. Filter by agent, team, or conversation tag using the filter bar.</P>
          </DocSection>

          {/* ── Team & Roles ── */}
          <DocSection id="team-roles" title="Team & Roles">
            <P>Invite team members from <strong style={{ color: "var(--c-on-surface)" }}>Settings → Team</strong>. Each member is assigned a role that controls their access level.</P>
            <H3>Roles</H3>
            <div style={{ background: "var(--c-surface-container-lowest)", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                ["Admin", "Full access — settings, billing, all conversations, reports"],
                ["Manager", "View all conversations, reports, and team management. Cannot change billing."],
                ["Agent", "Access only to assigned conversations and their own performance stats"],
              ].map(([role, desc], i) => (
                <div key={role} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: i < 2 ? "1px solid rgb(var(--fx-accent) / 0.06)" : "none", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", minWidth: 72, paddingTop: 1 }}>{role}</span>
                  <span style={{ fontSize: 13, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", lineHeight: 1.6 }}>{desc}</span>
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
            <div style={{ background: "var(--c-surface-container-lowest)", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                ["Starter", "₹499/mo", "Up to 3 agents, 5,000 messages/mo"],
                ["Growth", "₹999/mo", "Up to 10 agents, 25,000 messages/mo"],
                ["Pro", "₹1,999/mo", "Unlimited agents, 100,000 messages/mo"],
              ].map(([plan, price, desc], i) => (
                <div key={plan} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: i < 2 ? "1px solid rgb(var(--fx-accent) / 0.06)" : "none", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-primary-container)", fontFamily: "var(--font-geist-sans), sans-serif", minWidth: 72 }}>{plan}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", minWidth: 90 }}>{price}</span>
                  <span style={{ fontSize: 13, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif" }}>{desc}</span>
                </div>
              ))}
            </div>
            <H3>Upgrading or downgrading</H3>
            <P>Plan changes take effect immediately. Upgrades are prorated; downgrades apply at the next billing cycle. Manage your plan from <strong style={{ color: "var(--c-on-surface)" }}>Settings → Billing</strong>.</P>
            <H3>Cancellation</H3>
            <P>Cancel anytime from Settings → Billing. Your account remains active until the end of the current billing period. No refunds are issued for partial months.</P>
          </DocSection>

        </main>
      </div>

      <SiteFooter />
    </>
  );
}
