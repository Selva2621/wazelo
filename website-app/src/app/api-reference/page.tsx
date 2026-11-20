"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const METHOD_STYLES: Record<string, string> = {
  GET: "border-ink/20 text-ink",
  POST: "border-ink bg-ink text-paper",
  PUT: "border-rust/40 text-rust",
  PATCH: "border-rust/40 text-rust",
  DELETE: "border-rust bg-rust text-paper",
};

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const kicker = "text-xs font-medium uppercase tracking-[0.22em] text-ink-faint";

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-flex w-[4.25rem] shrink-0 justify-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] ${METHOD_STYLES[method] ?? "border-ink/20 text-ink"}`}>
      {method}
    </span>
  );
}

function Code({ children, lang = "json" }: { children: string; lang?: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-ink">
      <div className="border-b border-paper/10 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40">{lang}</div>
      <pre className="overflow-x-auto px-5 py-4">
        <code className="font-mono text-[13px] leading-[1.75] text-paper/90">{children}</code>
      </pre>
    </div>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

function Endpoint({ method, path, desc, params, bodyFields, responseExample, notes }: {
  method: string; path: string; desc: string;
  params?: [string, string, string][];
  bodyFields?: [string, string, string, boolean][];
  responseExample: string;
  notes?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((o: boolean) => !o);
    // Expanding shifts everything below; keep the TOC triggers in step.
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  return (
    <div className="border-b border-ink/10">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`group flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-4 text-left ${focusInk}`}
      >
        <MethodBadge method={method} />
        <code className="min-w-0 flex-1 font-mono text-[14px] text-ink">{path}</code>
        <span className="hidden text-sm text-ink-faint transition-colors group-hover:text-ink-soft md:inline">{desc}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pb-8 pl-0 md:pl-[5.25rem]">
          <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">{desc}</p>

          {params && params.length > 0 && (
            <>
              <p className={`${kicker} mb-3`}>Path / Query Parameters</p>
              <div className="mb-6 divide-y divide-ink/10 border-y border-ink/15">
                {params.map(([name, type, pdesc]) => (
                  <div key={name} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
                    <code className="min-w-[120px] font-mono text-[13px] font-medium text-ink">{name}</code>
                    <span className="min-w-[60px] font-mono text-[12px] text-rust">{type}</span>
                    <span className="text-sm text-ink-soft">{pdesc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {bodyFields && bodyFields.length > 0 && (
            <>
              <p className={`${kicker} mb-3`}>Request Body</p>
              <div className="mb-6 divide-y divide-ink/10 border-y border-ink/15">
                {bodyFields.map(([name, type, bdesc, required]) => (
                  <div key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                    <code className="min-w-[140px] font-mono text-[13px] font-medium text-ink">{name}</code>
                    <span className="min-w-[60px] font-mono text-[12px] text-rust">{type}</span>
                    {required && <span className="rounded-full border border-rust/40 px-2 py-px font-mono text-[10px] tracking-[0.05em] text-rust">required</span>}
                    <span className="text-sm text-ink-soft">{bdesc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className={`${kicker} mb-3`}>Response Example</p>
          <Code>{responseExample}</Code>

          {notes && <p className="border-l-2 border-rust pl-4 text-sm leading-relaxed text-ink-soft">{notes}</p>}
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
    <section id={id} data-rd="sec" className="scroll-mt-28 border-t border-ink/10 py-14 first:border-t-0 first:pt-0">
      <h2 className="mb-6 font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 max-w-[68ch]">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-ink">{children}</h3>;
}

function Endpoints({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 border-t border-ink/15">{children}</div>;
}

// ─── API Reference Page ───────────────────────────────────────────────────────
export default function ApiReferencePage() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("overview");

  useGSAP(
    () => {
      const triggers = apiSections.map((s) =>
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
        onEnter: () => setActive(apiSections[apiSections.length - 1].id),
        onLeaveBack: () => {
          const i = triggers.findIndex((t) => t.isActive);
          if (i >= 0) setActive(apiSections[i].id);
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

  const baseUrl = "https://api.wazelo.in/v1";

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar />

      {/* Hero */}
      <header className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
        <div data-rd="head" className="mx-auto max-w-6xl">
          <p className={kicker}>REST API · v1</p>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em]">
            API <em className="text-rust">Reference</em>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Integrate Wazelo into your own systems. Send messages, manage contacts, trigger automations, and listen to real-time events via webhooks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <code className="max-w-full truncate rounded-full border border-ink/15 bg-white/60 px-4 py-2 font-mono text-[13px] text-ink">
              Base URL: {baseUrl}
            </code>
            <a href="/docs" className={`inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-black active:scale-[0.98] ${focusInk}`}>
              <span aria-hidden className="material-symbols-outlined text-[16px]">menu_book</span>
              Read the Docs →
            </a>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="border-t border-ink/10 px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav data-rd="toc" aria-label="Endpoints" className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto">
              <p className={kicker}>Endpoints</p>
              <ol className="mt-5 flex flex-col border-l border-ink/10">
                {apiSections.map((s) => (
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
                <a href="/docs" className={`inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-rust ${focusInk}`}>
                  <span aria-hidden className="material-symbols-outlined text-[16px]">menu_book</span>
                  Full Docs →
                </a>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <main data-rd="body" className="min-w-0 text-[17px] leading-relaxed text-ink-soft">

            {/* ── Overview ── */}
            <ApiSection id="overview" title="Overview">
              <P>The Wazelo REST API lets you programmatically interact with contacts, conversations, messages, and campaigns. All requests require authentication via an API key.</P>
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
              <P>Wazelo uses API keys for authentication. Generate your key from <strong className="font-semibold text-ink">Settings → API Keys</strong> in your dashboard. Keep your API key secret — treat it like a password.</P>
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
              <Endpoints>

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
              </Endpoints>
            </ApiSection>

            {/* ── Messages ── */}
            <ApiSection id="messages-api" title="Messages">
              <P>Send WhatsApp messages to contacts. You can send template messages at any time, and freeform messages within the 24-hour customer service window.</P>
              <Endpoints>

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
              </Endpoints>
            </ApiSection>

            {/* ── Conversations ── */}
            <ApiSection id="conversations" title="Conversations">
              <P>Retrieve and manage conversations from your shared inbox.</P>
              <Endpoints>

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
              </Endpoints>
            </ApiSection>

            {/* ── Campaigns ── */}
            <ApiSection id="campaigns-api" title="Campaigns">
              <P>Create and monitor broadcast campaigns programmatically.</P>
              <Endpoints>

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
              </Endpoints>
            </ApiSection>

            {/* ── Webhooks ── */}
            <ApiSection id="webhooks" title="Webhooks">
              <P>Receive real-time event notifications by registering a webhook URL. Wazelo sends a POST request to your endpoint when events occur.</P>
              <H3>Registering a webhook</H3>
              <P>Go to <strong className="font-semibold text-ink">Settings → Webhooks → New Webhook</strong>. Enter your endpoint URL and select the events to subscribe to.</P>
              <H3>Supported events</H3>
              <div className="mb-6 divide-y divide-ink/10 border-y border-ink/15">
                {[
                  ["message.received", "A new inbound message arrived"],
                  ["message.delivered", "A sent message was delivered"],
                  ["message.read", "A sent message was read"],
                  ["conversation.assigned", "A conversation was assigned to an agent"],
                  ["conversation.resolved", "A conversation was marked resolved"],
                  ["contact.created", "A new contact was created"],
                  ["campaign.completed", "A campaign finished sending"],
                ].map(([event, desc]) => (
                  <div key={event} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                    <code className="font-mono text-[13px] font-medium text-ink sm:min-w-[200px]">{event}</code>
                    <span className="text-sm text-ink-soft">{desc}</span>
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
              <P>Each webhook request includes an <C>X-Wazelo-Signature</C> header — an HMAC-SHA256 signature of the request body using your webhook secret. Always verify this before processing the payload.</P>
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
              <P>Wazelo uses standard HTTP status codes. All error responses follow this format:</P>
              <Code>{`{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "No contact found with ID cnt_invalid",
    "status": 404
  }
}`}</Code>
              <div className="divide-y divide-ink/10 border-y border-ink/15">
                {[
                  ["400", "BAD_REQUEST", "Missing or invalid request parameters"],
                  ["401", "UNAUTHORIZED", "Missing or invalid API key"],
                  ["403", "FORBIDDEN", "Your API key doesn't have permission for this action"],
                  ["404", "NOT_FOUND", "The requested resource doesn't exist"],
                  ["409", "CONFLICT", "Resource already exists (e.g. duplicate phone number)"],
                  ["422", "VALIDATION_ERROR", "Request body failed validation — see errors array"],
                  ["429", "RATE_LIMITED", "Too many requests — back off and retry after the Retry-After header"],
                  ["500", "INTERNAL_ERROR", "Something went wrong on our side — contact support if this persists"],
                ].map(([code, name, desc]) => (
                  <div key={code} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                    <span className={`min-w-[36px] font-mono text-[13px] font-semibold ${parseInt(code) >= 500 ? "text-rust" : "text-ink"}`}>{code}</span>
                    <code className="min-w-[180px] font-mono text-[12px] text-ink-soft">{name}</code>
                    <span className="text-sm text-ink-soft">{desc}</span>
                  </div>
                ))}
              </div>
            </ApiSection>

          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
