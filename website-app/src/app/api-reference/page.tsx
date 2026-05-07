"use client";

import { useState, useEffect } from "react";
import { useBreakpoint } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET: "#86efac", POST: "#a3defe", PUT: "#fbbf24", PATCH: "#f9a8d4", DELETE: "#f87171",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: METHOD_COLORS[method] ?? "#e5e2e1", background: `${METHOD_COLORS[method]}18`, border: `1px solid ${METHOD_COLORS[method]}44`, borderRadius: 4, padding: "2px 8px", fontFamily: "'Courier New', monospace", letterSpacing: "0.06em" }}>
      {method}
    </span>
  );
}

function Code({ children, lang = "json" }: { children: string; lang?: string }) {
  const color = lang === "bash" ? "#fbbf24" : lang === "json" ? "#a3defe" : "#86efac";
  return (
    <pre style={{ background: "#0a0a0a", border: "1px solid rgba(255,183,125,0.08)", borderRadius: 8, padding: "16px 20px", overflowX: "auto", marginBottom: 20 }}>
      <code style={{ fontSize: 13, color, fontFamily: "'Courier New', monospace", lineHeight: 1.75 }}>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, desc, params, bodyFields, responseExample, notes }: {
  method: string; path: string; desc: string;
  params?: [string, string, string][];
  bodyFields?: [string, string, string, boolean][];
  responseExample: string;
  notes?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid rgba(255,183,125,0.08)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen((o: boolean) => !o)} style={{
        width: "100%", background: open ? "#1c1b1b" : "#161616", border: "none", cursor: "pointer",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      }}>
        <MethodBadge method={method} />
        <code style={{ fontSize: 13, color: "#e5e2e1", fontFamily: "'Courier New', monospace", flex: 1 }}>{path}</code>
        <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: "'Inter', sans-serif", marginRight: 8 }}>{desc}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(219,194,176,0.4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>expand_more</span>
      </button>
      {open && (
        <div style={{ padding: "20px 24px", background: "#131313", borderTop: "1px solid rgba(255,183,125,0.06)" }}>
          <p style={{ fontSize: 14, color: "rgba(219,194,176,0.65)", fontFamily: "'Inter', sans-serif", marginBottom: 20, lineHeight: 1.7 }}>{desc}</p>

          {params && params.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>Path / Query Parameters</p>
              <div style={{ background: "#0e0e0e", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
                {params.map(([name, type, pdesc], i) => (
                  <div key={name} style={{ display: "flex", gap: 16, padding: "10px 16px", borderBottom: i < params.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", flexWrap: "wrap" }}>
                    <code style={{ fontSize: 12, color: "#ffb77d", fontFamily: "'Courier New', monospace", minWidth: 120 }}>{name}</code>
                    <span style={{ fontSize: 11, color: "#a3defe", fontFamily: "'Courier New', monospace", minWidth: 60 }}>{type}</span>
                    <span style={{ fontSize: 12, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{pdesc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {bodyFields && bodyFields.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>Request Body</p>
              <div style={{ background: "#0e0e0e", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
                {bodyFields.map(([name, type, bdesc, required], i) => (
                  <div key={name} style={{ display: "flex", gap: 16, padding: "10px 16px", borderBottom: i < bodyFields.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", flexWrap: "wrap", alignItems: "center" }}>
                    <code style={{ fontSize: 12, color: "#ffb77d", fontFamily: "'Courier New', monospace", minWidth: 140 }}>{name}</code>
                    <span style={{ fontSize: 11, color: "#a3defe", fontFamily: "'Courier New', monospace", minWidth: 60 }}>{type}</span>
                    {required && <span style={{ fontSize: 10, color: "#f87171", border: "1px solid #f8717144", borderRadius: 4, padding: "1px 6px", fontFamily: "'Inter', sans-serif", letterSpacing: "0.05em" }}>required</span>}
                    <span style={{ fontSize: 12, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{bdesc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>Response Example</p>
          <Code>{responseExample}</Code>

          {notes && <p style={{ fontSize: 13, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif", lineHeight: 1.7, borderLeft: "2px solid rgba(255,183,125,0.2)", paddingLeft: 12 }}>{notes}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar sections ─────────────────────────────────────────────────────────
const apiSections = [
  { id: "overview",      label: "Overview" },
  { id: "auth",          label: "Authentication" },
  { id: "contacts-api",  label: "Contacts" },
  { id: "messages-api",  label: "Messages" },
  { id: "conversations", label: "Conversations" },
  { id: "campaigns-api", label: "Campaigns" },
  { id: "webhooks",      label: "Webhooks" },
  { id: "errors",        label: "Error Codes" },
];

function ApiSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 64, scrollMarginTop: 88 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", marginBottom: 12 }}>{title}</h2>
      <div style={{ width: 40, height: 2, background: "linear-gradient(to right,#ffb77d,transparent)", marginBottom: 24, borderRadius: 2 }} />
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 10, marginTop: 24 }}>{children}</h3>;
}

// ─── API Reference Page ───────────────────────────────────────────────────────
export default function ApiReferencePage() {
  const { mobile } = useBreakpoint();
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    apiSections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const baseUrl = "https://api.wazelo.in/v1";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      {/* Hero */}
      <div style={{ background: "#131313", borderBottom: "1px solid rgba(255,183,125,0.06)", padding: mobile ? "100px 20px 48px" : "100px 48px 56px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(163,222,254,0.08)", border: "1px solid rgba(163,222,254,0.2)", marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#a3defe" }}>api</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a3defe", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>REST API · v1</span>
          </div>
          <h1 style={{ fontSize: mobile ? "clamp(28px,7vw,44px)" : "clamp(32px,3.5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
            API Reference
          </h1>
          <p style={{ fontSize: 16, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif", maxWidth: 560 }}>
            Integrate Wazelo CRM into your own systems. Send messages, manage contacts, trigger automations, and listen to real-time events via webhooks.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 13, color: "#a3defe", background: "#0e0e0e", border: "1px solid rgba(163,222,254,0.15)", borderRadius: 6, padding: "8px 14px", fontFamily: "'Courier New', monospace" }}>
              Base URL: {baseUrl}
            </code>
            <a href="/docs" style={{ fontSize: 13, color: "#ffb77d", fontFamily: "'Inter', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>menu_book</span>
              Read the Docs →
            </a>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ background: "var(--bg)", maxWidth: 1200, margin: "0 auto", padding: mobile ? "0" : "0 48px", display: "flex", gap: 0, minHeight: "80vh" }}>

        {/* Sidebar */}
        {!mobile && (
          <aside style={{ width: 220, flexShrink: 0, paddingTop: 40, paddingRight: 32, position: "sticky", top: 64, alignSelf: "flex-start", height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(219,194,176,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>Endpoints</p>
            {apiSections.map(s => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} style={{
                display: "block", padding: "7px 12px", borderRadius: 6, marginBottom: 2,
                fontSize: 13, fontFamily: "'Inter', sans-serif", textDecoration: "none",
                fontWeight: active === s.id ? 600 : 400,
                color: active === s.id ? "#a3defe" : "rgba(219,194,176,0.5)",
                background: active === s.id ? "rgba(163,222,254,0.07)" : "transparent",
                borderLeft: active === s.id ? "2px solid #a3defe" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{s.label}</a>
            ))}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,183,125,0.08)" }}>
              <a href="/docs" style={{ fontSize: 13, color: "#ffb77d", fontFamily: "'Inter', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>menu_book</span>
                Full Docs →
              </a>
            </div>
          </aside>
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: mobile ? "40px 20px 80px" : "40px 0 100px 40px", borderLeft: mobile ? "none" : "1px solid rgba(255,183,125,0.06)", minWidth: 0 }}>

          {/* ── Overview ── */}
          <ApiSection id="overview" title="Overview">
            <P>The Wazelo CRM REST API lets you programmatically interact with contacts, conversations, messages, and campaigns. All requests require authentication via an API key.</P>
            <H3>Request format</H3>
            <P>All requests must include the following headers:</P>
            <Code lang="bash">{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Accept: application/json`}</Code>
            <H3>Response format</H3>
            <P>All responses return JSON. Successful responses use HTTP 2xx status codes. Errors return 4xx or 5xx with an error object.</P>
            <Code>{`{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145
  }
}`}</Code>
          </ApiSection>

          {/* ── Auth ── */}
          <ApiSection id="auth" title="Authentication">
            <P>Wazelo CRM uses API keys for authentication. Generate your key from <strong style={{ color: "#e5e2e1" }}>Settings → API Keys</strong> in your dashboard. Keep your API key secret — treat it like a password.</P>
            <H3>Generating an API key</H3>
            <P>Go to Settings → API Keys → New Key. Give it a name and select the permission scope. Keys can be scoped to read-only, read-write, or specific resources.</P>
            <H3>Using the key</H3>
            <Code lang="bash">{`curl -X GET https://api.wazelo.in/v1/contacts \\
  -H "Authorization: Bearer wzl_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`}</Code>
            <H3>Key rotation</H3>
            <P>Rotate your API key from the Settings panel at any time. The old key is immediately invalidated. Update your integrations before rotating in production.</P>
          </ApiSection>

          {/* ── Contacts ── */}
          <ApiSection id="contacts-api" title="Contacts">
            <P>Manage your contact database — create, retrieve, update, tag, and delete contacts.</P>

            <Endpoint
              method="GET" path="/contacts"
              desc="List all contacts with optional filters and pagination."
              params={[
                ["page", "integer", "Page number (default: 1)"],
                ["limit", "integer", "Results per page, max 100 (default: 20)"],
                ["tag", "string", "Filter by tag slug"],
                ["search", "string", "Search by name or phone number"],
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "cnt_01HX4K9",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "email": "rahul@example.com",
      "tags": ["hot-lead", "mumbai"],
      "created_at": "2025-03-14T10:22:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 312 }
}`}
            />

            <Endpoint
              method="GET" path="/contacts/:id"
              desc="Retrieve a single contact by ID."
              params={[["id", "string", "Contact ID (e.g. cnt_01HX4K9)"]]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "cnt_01HX4K9",
    "name": "Rahul Sharma",
    "phone": "919876543210",
    "email": "rahul@example.com",
    "tags": ["hot-lead"],
    "custom_fields": { "city": "Mumbai", "budget": "50L" },
    "last_seen": "2025-04-10T08:14:00Z",
    "created_at": "2025-03-14T10:22:00Z"
  }
}`}
            />

            <Endpoint
              method="POST" path="/contacts"
              desc="Create a new contact."
              bodyFields={[
                ["phone", "string", "Phone number with country code, no +", true],
                ["name", "string", "Full name of the contact", false],
                ["email", "string", "Email address", false],
                ["tags", "string[]", "Array of tag slugs to apply", false],
                ["custom_fields", "object", "Key-value pairs for custom fields", false],
              ]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "cnt_01HX5M2",
    "phone": "919988776655",
    "name": "Priya Nair",
    "tags": ["trial-user"],
    "created_at": "2025-04-19T09:00:00Z"
  }
}`}
            />

            <Endpoint
              method="PATCH" path="/contacts/:id"
              desc="Update a contact's details. Only provided fields are updated."
              params={[["id", "string", "Contact ID"]]}
              bodyFields={[
                ["name", "string", "Updated name", false],
                ["email", "string", "Updated email", false],
                ["tags", "string[]", "Replaces the entire tag list", false],
                ["custom_fields", "object", "Merges with existing custom fields", false],
              ]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "cnt_01HX4K9",
    "name": "Rahul S.",
    "tags": ["hot-lead", "site-visit"],
    "updated_at": "2025-04-19T11:30:00Z"
  }
}`}
            />

            <Endpoint
              method="DELETE" path="/contacts/:id"
              desc="Permanently delete a contact and all associated conversation history."
              params={[["id", "string", "Contact ID"]]}
              responseExample={`{
  "success": true,
  "message": "Contact cnt_01HX4K9 deleted."
}`}
              notes="This action is irreversible. All conversation history linked to this contact will also be deleted."
            />
          </ApiSection>

          {/* ── Messages ── */}
          <ApiSection id="messages-api" title="Messages">
            <P>Send WhatsApp messages to contacts. You can send template messages at any time, and freeform messages within the 24-hour customer service window.</P>

            <Endpoint
              method="POST" path="/messages/send"
              desc="Send a WhatsApp message to a contact."
              bodyFields={[
                ["to", "string", "Recipient phone number with country code, no +", true],
                ["type", "string", '"template" or "text"', true],
                ["template_name", "string", "Approved template name (required if type=template)", false],
                ["template_vars", "string[]", "Variable substitutions in order (e.g. [\"Rahul\", \"50L\"])", false],
                ["text", "string", "Message body (required if type=text, within 24h window only)", false],
              ]}
              responseExample={`{
  "success": true,
  "data": {
    "message_id": "msg_01HX6P9",
    "status": "queued",
    "to": "919876543210",
    "type": "template",
    "queued_at": "2025-04-19T10:00:00Z"
  }
}`}
              notes="Template messages can be sent at any time. Text messages require a 24-hour active session (i.e. the contact must have messaged you within the last 24 hours)."
            />

            <Endpoint
              method="GET" path="/messages/:id"
              desc="Get the delivery status of a sent message."
              params={[["id", "string", "Message ID (e.g. msg_01HX6P9)"]]}
              responseExample={`{
  "success": true,
  "data": {
    "message_id": "msg_01HX6P9",
    "status": "read",
    "delivered_at": "2025-04-19T10:00:08Z",
    "read_at": "2025-04-19T10:04:21Z"
  }
}`}
            />
          </ApiSection>

          {/* ── Conversations ── */}
          <ApiSection id="conversations" title="Conversations">
            <P>Retrieve and manage conversations from your shared inbox.</P>

            <Endpoint
              method="GET" path="/conversations"
              desc="List conversations with filters."
              params={[
                ["status", "string", '"open", "resolved", "pending" (default: open)'],
                ["assigned_to", "string", "Filter by agent user ID"],
                ["page", "integer", "Page number"],
                ["limit", "integer", "Results per page, max 50"],
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "conv_01HX7Q1",
      "contact": { "id": "cnt_01HX4K9", "name": "Rahul Sharma", "phone": "919876543210" },
      "status": "open",
      "assigned_to": { "id": "usr_01HX2A3", "name": "Sneha R." },
      "last_message": "Yes, I'm interested in the 2BHK",
      "unread_count": 2,
      "updated_at": "2025-04-19T09:55:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 48 }
}`}
            />

            <Endpoint
              method="PATCH" path="/conversations/:id"
              desc="Update conversation status or assignment."
              params={[["id", "string", "Conversation ID"]]}
              bodyFields={[
                ["status", "string", '"open", "resolved", or "pending"', false],
                ["assigned_to", "string", "Agent user ID to assign the conversation", false],
              ]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "conv_01HX7Q1",
    "status": "resolved",
    "resolved_at": "2025-04-19T12:00:00Z"
  }
}`}
            />
          </ApiSection>

          {/* ── Campaigns ── */}
          <ApiSection id="campaigns-api" title="Campaigns">
            <P>Create and monitor broadcast campaigns programmatically.</P>

            <Endpoint
              method="POST" path="/campaigns"
              desc="Create and schedule a new campaign."
              bodyFields={[
                ["name", "string", "Internal campaign name", true],
                ["template_name", "string", "Approved Meta template name", true],
                ["segment", "object", 'Targeting rules — e.g. {"tags": ["hot-lead"]}', true],
                ["scheduled_at", "string", "ISO 8601 datetime to send (omit to send immediately)", false],
                ["template_vars_map", "object", 'Map template vars to contact fields — e.g. {"1": "name"}', false],
              ]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "cmp_01HX8R5",
    "name": "April Launch Blast",
    "status": "scheduled",
    "recipient_count": 847,
    "scheduled_at": "2025-04-20T09:00:00Z"
  }
}`}
            />

            <Endpoint
              method="GET" path="/campaigns/:id/stats"
              desc="Get real-time delivery and engagement stats for a campaign."
              params={[["id", "string", "Campaign ID"]]}
              responseExample={`{
  "success": true,
  "data": {
    "id": "cmp_01HX8R5",
    "sent": 847,
    "delivered": 831,
    "read": 614,
    "replied": 88,
    "failed": 16,
    "delivery_rate": "98.1%",
    "read_rate": "73.9%",
    "reply_rate": "10.5%"
  }
}`}
            />
          </ApiSection>

          {/* ── Webhooks ── */}
          <ApiSection id="webhooks" title="Webhooks">
            <P>Receive real-time event notifications by registering a webhook URL. Wazelo CRM sends a POST request to your endpoint when events occur.</P>
            <H3>Registering a webhook</H3>
            <P>Go to <strong style={{ color: "#e5e2e1" }}>Settings → Webhooks → New Webhook</strong>. Enter your endpoint URL and select the events to subscribe to.</P>
            <H3>Supported events</H3>
            <div style={{ background: "#1c1b1b", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                ["message.received", "A new inbound message arrived"],
                ["message.delivered", "A sent message was delivered"],
                ["message.read", "A sent message was read"],
                ["conversation.assigned", "A conversation was assigned to an agent"],
                ["conversation.resolved", "A conversation was marked resolved"],
                ["contact.created", "A new contact was created"],
                ["campaign.completed", "A campaign finished sending"],
              ].map(([event, desc], i) => (
                <div key={event} style={{ display: "flex", gap: 16, padding: "10px 16px", borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <code style={{ fontSize: 12, color: "#a3defe", fontFamily: "'Courier New', monospace", minWidth: 200 }}>{event}</code>
                  <span style={{ fontSize: 12, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{desc}</span>
                </div>
              ))}
            </div>
            <H3>Payload example — message.received</H3>
            <Code>{`{
  "event": "message.received",
  "timestamp": "2025-04-19T10:14:33Z",
  "data": {
    "message_id": "msg_01HX9T7",
    "from": "919876543210",
    "contact_id": "cnt_01HX4K9",
    "conversation_id": "conv_01HX7Q1",
    "type": "text",
    "text": "Hi, I want to book a site visit",
    "received_at": "2025-04-19T10:14:33Z"
  }
}`}</Code>
            <H3>Webhook security</H3>
            <P>Each webhook request includes an <code style={{ background: "#1c1b1b", padding: "1px 6px", borderRadius: 4, color: "#ffb77d", fontSize: 13 }}>X-Wazelo-Signature</code> header — an HMAC-SHA256 signature of the request body using your webhook secret. Always verify this before processing the payload.</P>
            <Code lang="js">{`const crypto = require("crypto");

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</Code>
          </ApiSection>

          {/* ── Errors ── */}
          <ApiSection id="errors" title="Error Codes">
            <P>Wazelo CRM uses standard HTTP status codes. All error responses follow this format:</P>
            <Code>{`{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "No contact found with ID cnt_invalid",
    "status": 404
  }
}`}</Code>
            <div style={{ background: "#1c1b1b", borderRadius: 8, overflow: "hidden" }}>
              {[
                ["400", "BAD_REQUEST", "Missing or invalid request parameters"],
                ["401", "UNAUTHORIZED", "Missing or invalid API key"],
                ["403", "FORBIDDEN", "Your API key doesn't have permission for this action"],
                ["404", "NOT_FOUND", "The requested resource doesn't exist"],
                ["409", "CONFLICT", "Resource already exists (e.g. duplicate phone number)"],
                ["422", "VALIDATION_ERROR", "Request body failed validation — see errors array"],
                ["429", "RATE_LIMITED", "Too many requests — back off and retry after the Retry-After header"],
                ["500", "INTERNAL_ERROR", "Something went wrong on our side — contact support if this persists"],
              ].map(([code, name, desc], i) => (
                <div key={code} style={{ display: "flex", gap: 16, padding: "12px 16px", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.04)" : "none", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: parseInt(code) >= 500 ? "#f87171" : parseInt(code) >= 400 ? "#fbbf24" : "#86efac", fontFamily: "'Courier New', monospace", minWidth: 36 }}>{code}</span>
                  <code style={{ fontSize: 12, color: "#a3defe", fontFamily: "'Courier New', monospace", minWidth: 180 }}>{name}</code>
                  <span style={{ fontSize: 12, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif" }}>{desc}</span>
                </div>
              ))}
            </div>
          </ApiSection>

        </main>
      </div>

      <SiteFooter />
    </>
  );
}
