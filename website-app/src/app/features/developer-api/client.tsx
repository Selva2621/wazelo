"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const endpoints = [
  {
    method: "POST",
    path: "/v1/messages/send",
    request: `{
  "to": "+91987654321",
  "type": "text",
  "text": {
    "body": "Hello {{name}}, your order is confirmed!"
  },
  "context": {
    "contact_id": "cnt_01HXYZ",
    "org_id": "org_01ABCD"
  }
}`,
    response: `{
  "id": "msg_01HXYZ9876",
  "status": "queued",
  "to": "+91987654321",
  "timestamp": "2025-05-05T10:23:41Z",
  "wamid": "wamid.HBgMOTE5ODc2..."
}`,
  },
  {
    method: "GET",
    path: "/v1/contacts",
    request: `{
  "filter": {
    "tag": "hot_lead",
    "score_min": 70
  },
  "pagination": {
    "page": 1,
    "limit": 25
  }
}`,
    response: `{
  "contacts": [
    {
      "id": "cnt_01HXYZ",
      "name": "Ananya Sharma",
      "phone": "+91987654321",
      "score": 91,
      "tags": ["hot_lead"]
    }
  ],
  "total": 47,
  "page": 1
}`,
  },
  {
    method: "POST",
    path: "/v1/webhooks",
    request: `{
  "url": "https://your-app.com/webhooks",
  "events": [
    "message.received",
    "message.delivered",
    "conversation.resolved"
  ],
  "secret": "whsec_xxxxxxxx"
}`,
    response: `{
  "id": "whk_01HXYZ1234",
  "url": "https://your-app.com/webhooks",
  "events": ["message.received"],
  "status": "active",
  "created_at": "2025-05-05T10:23:41Z"
}`,
  },
  {
    method: "GET",
    path: "/v1/analytics/summary",
    request: `{
  "period": "last_30_days",
  "metrics": [
    "messages_sent",
    "response_time_avg",
    "csat_score",
    "resolution_rate"
  ]
}`,
    response: `{
  "period": "last_30_days",
  "messages_sent": 48500,
  "response_time_avg": 252,
  "csat_score": 4.3,
  "resolution_rate": 0.87
}`,
  },
];

function ApiMockup() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setDisplayedResponse("");
    const fullResponse = endpoints[activeTab].response;
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setDisplayedResponse(fullResponse.slice(0, index));
      if (index >= fullResponse.length) {
        clearInterval(interval);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(endpoints[activeTab].path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodStyle = (method: string): React.CSSProperties =>
    method === "POST"
      ? { background: "#22c55e1a", color: "#22c55e", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }
      : { background: "#3b82f61a", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 };

  const methodStyleLarge = (method: string): React.CSSProperties =>
    method === "POST"
      ? { background: "#22c55e1a", color: "#22c55e", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: "monospace" }
      : { background: "#3b82f61a", color: "#3b82f6", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: "monospace" };

  const fullResponse = endpoints[activeTab].response;
  const isTyping = displayedResponse.length < fullResponse.length;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffb77d" }}>
          See it in action
        </span>
      </div>
      <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, color: "#e5e2e1", marginBottom: 0 }}>
        REST API built for developers.
      </h2>

      <div style={{ background: "#0e0e0e", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: 32 }}>
        {/* Chrome bar */}
        <div style={{ background: "#0e0e0e", height: 36, display: "flex", alignItems: "center", paddingLeft: 14, gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "#131313", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
          {endpoints.map((ep, i) => {
            const isActive = activeTab === i;
            return (
              <div
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                  background: isActive ? "#1c1b1b" : "transparent",
                  borderBottom: isActive ? "2px solid #ffb77d" : "2px solid transparent",
                  color: isActive ? "#fff" : "rgba(219,194,176,0.4)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={methodStyle(ep.method)}>{ep.method}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>{ep.path}</span>
              </div>
            );
          })}
        </div>

        {/* Code area */}
        <div style={{ display: "flex", minHeight: 320 }}>
          {/* Left: Request */}
          <div style={{ flex: 1, padding: "20px 20px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(219,194,176,0.4)" }}>
                Request
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: copied ? "#22c55e" : "rgba(219,194,176,0.6)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: "monospace" }}>
              <span style={methodStyleLarge(endpoints[activeTab].method)}>{endpoints[activeTab].method}</span>
              <span style={{ fontSize: 14, color: "#e5e2e1" }}>{endpoints[activeTab].path}</span>
            </div>

            <div style={{ background: "#0e0e0e", borderRadius: 8, padding: "14px 16px", overflow: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>
              <pre style={{ margin: 0, color: "#86efac", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {endpoints[activeTab].request.split("\n").map((line, li) => {
                  const keyMatch = line.match(/^(\s*)("[\w_]+")(\s*:\s*)(.*)$/);
                  if (keyMatch) {
                    const [, indent, key, colon, rest] = keyMatch;
                    const isNumOrBool = /^-?\d|true|false/.test(rest.trim());
                    return (
                      <span key={li}>
                        {indent}
                        <span style={{ color: "#7dd3fc" }}>{key}</span>
                        <span style={{ color: "#94a3b8" }}>{colon}</span>
                        <span style={{ color: isNumOrBool ? "#f9a8d4" : "#86efac" }}>{rest}</span>
                        {"\n"}
                      </span>
                    );
                  }
                  return (
                    <span key={li} style={{ color: "#94a3b8" }}>
                      {line}
                      {"\n"}
                    </span>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* Right: Response */}
          <div style={{ flex: 1, padding: "20px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(219,194,176,0.4)" }}>
                Response
              </span>
              <span style={{
                background: "rgba(34,197,94,0.1)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}>
                200 OK
              </span>
            </div>

            <div style={{ background: "#0e0e0e", borderRadius: 8, padding: "14px 16px", overflow: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>
              <pre style={{ margin: 0, color: "#86efac", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {displayedResponse}
                {isTyping && (
                  <span style={{
                    display: "inline-block",
                    width: 7,
                    height: 14,
                    background: "#ffb77d",
                    marginLeft: 2,
                    verticalAlign: "middle",
                    animation: "cursorBlink 1s ease-in-out infinite",
                  }} />
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "developer-api",
  tag: "Developer API",
  heroTitle: "Build anything<br /><span style=\"color:#ffb77d\">on top of Wazelo.</span>",
  heroSubtitle: "Full REST API, webhook system, and API key management for teams that need to integrate Wazelo CRM with their own systems, automations, or data pipelines.",
  heroScreen: "",
  overviewTitle: "Your data, your way.",
  overviewDesc: "Not every workflow fits inside a SaaS interface. Wazelo CRM's Developer API gives you programmatic access to contacts, conversations, campaigns, and analytics — so your engineering team can build custom integrations, sync data to internal systems, and trigger Wazelo actions from external events. Generate API keys, subscribe to webhooks, and explore the full reference in the docs.",
  capabilities: [
    { icon: "code", title: "Full REST API", desc: "Read and write contacts, conversations, campaigns, messages, and analytics data via a documented REST API." },
    { icon: "key", title: "API key management", desc: "Generate, rotate, and revoke API keys from the dashboard. Scoped keys available for read-only or write access." },
    { icon: "webhook", title: "Webhook subscriptions", desc: "Subscribe to real-time events: new message, conversation assigned, deal stage changed, CSAT received, and more." },
    { icon: "data_object", title: "JSON response format", desc: "Clean, consistent JSON responses. Pagination, filtering, and sorting built into every list endpoint." },
    { icon: "book", title: "Full API reference docs", desc: "Every endpoint documented with request/response examples, authentication instructions, and rate limit info." },
    { icon: "speed", title: "Rate limits and reliability", desc: "Generous rate limits for Pro and Enterprise plans. Retry headers and idempotency keys supported." },
  ],
  howItWorks: [
    { step: "01", title: "Generate an API key", desc: "Go to Settings → Developer → API Keys. Click 'Create Key', name it, choose its scope, and copy the key. It only shows once." },
    { step: "02", title: "Authenticate your requests", desc: "Pass your API key in the Authorization header: Bearer <your-api-key>. All requests require HTTPS." },
    { step: "03", title: "Call any endpoint", desc: "Use our REST API to fetch contacts, send messages, create deals, tag contacts, or pull analytics. Full reference at /api-reference." },
    { step: "04", title: "Subscribe to webhooks", desc: "Register a webhook URL to receive real-time POST events for any action in Wazelo — new message, resolved conversation, CSAT score received, and more." },
  ],
  screens: [],
  interactiveSection: <ApiMockup />,
  relatedFeatures: [
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Analytics", href: "/features/analytics", icon: "bar_chart" },
    { label: "Contacts CRM", href: "/features/contacts", icon: "group" },
    { label: "Bulk Campaigns", href: "/features/campaigns", icon: "campaign" },
  ],
};

export default function DeveloperApiClient() {
  return <FeatureDetailPage data={data} />;
}
