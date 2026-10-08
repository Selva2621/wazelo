"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const endpoints = [
  {
    method: "POST",
    path: "/messages/send",
    request: "{\n  \"to\": \"+919876543210\",\n  \"type\": \"text\",\n  \"body\": \"Hi Ananya, your order is confirmed!\"\n}",
    response: "{\n  \"success\": true,\n  \"data\": {\n    \"message\": {\n      \"id\": \"8f2c41d7-...\",\n      \"to\": \"+919876543210\",\n      \"type\": \"text\",\n      \"status\": \"QUEUED\",\n      \"createdAt\": \"2026-10-09T10:23:41Z\"\n    },\n    \"deduplicated\": false\n  },\n  \"timestamp\": \"2026-10-09T10:23:41Z\"\n}"
  },
  {
    method: "POST",
    path: "/messages/send-bulk",
    request: "{\n  \"to\": [\n    \"+919876543210\",\n    \"+919812345678\"\n  ],\n  \"type\": \"image\",\n  \"mediaUrl\": \"https://example.com/diwali-offer.jpg\",\n  \"caption\": \"Our Diwali offer is live\"\n}",
    response: "{\n  \"success\": true,\n  \"data\": {\n    \"queued\": 2\n  },\n  \"timestamp\": \"2026-10-09T10:24:02Z\"\n}"
  },
  {
    method: "GET",
    path: "/contacts",
    request: "\"limit\": 20\n\"X-API-Key\": \"your-api-key\"",
    response: "{\n  \"success\": true,\n  \"data\": {\n    \"data\": [\n      {\n        \"id\": \"c1a9...\",\n        \"name\": \"Ananya Sharma\",\n        \"phoneNumber\": \"+919876543210\",\n        \"leadStatus\": \"INTERESTED\",\n        \"source\": \"WHATSAPP\"\n      }\n    ],\n    \"nextCursor\": \"c1a9...\",\n    \"hasMore\": true\n  }\n}"
  },
  {
    method: "GET",
    path: "/session/status",
    request: "\"X-API-Key\": \"your-api-key\"",
    response: "{\n  \"success\": true,\n  \"data\": {\n    \"connected\": true,\n    \"sessions\": [\n      {\n        \"phoneNumber\": \"+919876543210\",\n        \"status\": \"CONNECTED\"\n      }\n    ]\n  }\n}"
  }
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
      ? { background: "#22c55e1a", color: "var(--c-success)", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }
      : { background: "#3b82f61a", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 };

  const methodStyleLarge = (method: string): React.CSSProperties =>
    method === "POST"
      ? { background: "#22c55e1a", color: "var(--c-success)", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: "monospace" }
      : { background: "#3b82f61a", color: "#3b82f6", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: "monospace" };

  const fullResponse = endpoints[activeTab].response;
  const isTyping = displayedResponse.length < fullResponse.length;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-primary-container)" }}>
          See it in action
        </span>
      </div>
      <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 0 }}>
        Real requests, real responses.
      </h2>

      <div style={{ background: "var(--c-surface)", borderRadius: 16, boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)", overflow: "hidden", marginTop: 32 }}>
        {/* Chrome bar */}
        <div style={{ background: "var(--c-surface)", height: 36, display: "flex", alignItems: "center", paddingLeft: 14, gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "var(--c-surface)", borderBottom: "1px solid rgb(var(--fx-ink) / 0.06)", overflowX: "auto" }}>
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
                  background: isActive ? "var(--c-surface-container-lowest)" : "transparent",
                  borderBottom: isActive ? "2px solid var(--c-primary-container)" : "2px solid transparent",
                  color: isActive ? "var(--c-on-surface)" : "var(--c-placeholder)",
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
          <div style={{ flex: 1, padding: "20px 20px", borderRight: "1px solid rgb(var(--fx-ink) / 0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-placeholder)" }}>
                Request
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: "var(--c-surface-container-high)",
                  border: "1px solid rgb(var(--fx-ink) / 0.1)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: copied ? "var(--c-success)" : "var(--c-on-surface-variant)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: "monospace" }}>
              <span style={methodStyleLarge(endpoints[activeTab].method)}>{endpoints[activeTab].method}</span>
              <span style={{ fontSize: 14, color: "var(--c-on-surface)" }}>/api/v1/developer{endpoints[activeTab].path}</span>
            </div>

            <div style={{ background: "var(--c-surface)", borderRadius: 8, padding: "14px 16px", overflow: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>
              <pre style={{ margin: 0, color: "var(--c-code-green)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {endpoints[activeTab].request.split("\n").map((line, li) => {
                  const keyMatch = line.match(/^(\s*)("[\w_]+")(\s*:\s*)(.*)$/);
                  if (keyMatch) {
                    const [, indent, key, colon, rest] = keyMatch;
                    const isNumOrBool = /^-?\d|true|false/.test(rest.trim());
                    return (
                      <span key={li}>
                        {indent}
                        <span style={{ color: "var(--c-code-cyan)" }}>{key}</span>
                        <span style={{ color: "var(--c-placeholder)" }}>{colon}</span>
                        <span style={{ color: isNumOrBool ? "var(--c-code-pink)" : "var(--c-code-green)" }}>{rest}</span>
                        {"\n"}
                      </span>
                    );
                  }
                  return (
                    <span key={li} style={{ color: "var(--c-placeholder)" }}>
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
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-placeholder)" }}>
                Response
              </span>
              <span style={{
                background: "color-mix(in srgb, var(--c-success) 10%, transparent)",
                color: "var(--c-success)",
                border: "1px solid color-mix(in srgb, var(--c-success) 20%, transparent)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}>
                200 OK
              </span>
            </div>

            <div style={{ background: "var(--c-surface)", borderRadius: 8, padding: "14px 16px", overflow: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>
              <pre style={{ margin: 0, color: "var(--c-code-green)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {displayedResponse}
                {isTyping && (
                  <span style={{
                    display: "inline-block",
                    width: 7,
                    height: 14,
                    background: "var(--c-primary-container)",
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
  heroTitle: "Build anything<br /><span style=\"color:var(--c-primary-container)\">on top of Wazelo.</span>",
  heroSubtitle: "Send WhatsApp messages and manage contacts from your own code, and get a webhook when something happens.",
  overviewTitle: "Connect Wazelo to your systems.",
  overviewDesc: "Create an API key in Settings, send it in the X-API-Key header, and call the REST API to send messages, message up to 100 numbers at once, use templates, manage contacts and check your WhatsApp connection. Webhooks push events like a received message or a finished campaign to your URL, signed so you can verify them and retried if your server is down.",
  capabilities: [
    { icon: "send", title: "Send messages", desc: "Send text, media or a template, or the same message to up to 100 numbers in one request." },
    { icon: "contacts", title: "Contacts API", desc: "List, create, read and update contacts, up to 100 per page." },
    { icon: "key", title: "API keys", desc: "Create keys with an expiry date, rotate them and revoke them from Settings." },
    { icon: "webhook", title: "Webhooks", desc: "Subscribe to 11 events and receive a signed POST at your URL when they happen." },
    { icon: "verified_user", title: "Signed and retried", desc: "HMAC-SHA256 signatures, retries with backoff, a delivery log and a Send test button." },
    { icon: "terminal", title: "Quick Start", desc: "Copy-ready examples in cURL, Node and Python, plus API Logs of your recent calls." },
  ],
  details: [
    { title: "Endpoints", items: ["POST /messages/send", "POST /messages/send-bulk", "POST /messages/send-template", "GET /messages", "GET /messages/:id", "GET, POST /contacts", "GET, PUT /contacts/:id", "GET, POST /templates", "GET /session/status"] },
    { title: "Webhook events", items: ["MESSAGE_RECEIVED", "MESSAGE_SENT", "MESSAGE_DELIVERED", "MESSAGE_FAILED", "CONTACT_CREATED", "CONTACT_UPDATED", "CAMPAIGN_COMPLETED", "CAMPAIGN_FAILED", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "SUBSCRIPTION_CHANGED"] },
    { title: "Security and delivery", items: ["X-API-Key header", "Key expiry and rotation", "X-Webhook-Signature", "X-Webhook-Timestamp", "Custom headers", "Up to 10 retries", "Paused after 10 failures", "Up to 25 webhooks"] },
  ],
  howItWorks: [
    { step: "01", title: "Create a key", desc: "Open Settings, Developer API, API Keys and click New API Key. Copy it now, it's shown only once." },
    { step: "02", title: "Connect WhatsApp", desc: "API messages go out from your connected number, so link it by QR first." },
    { step: "03", title: "Call the API", desc: "Send requests to /api/v1/developer with your key in the X-API-Key header." },
    { step: "04", title: "Add a webhook", desc: "In Settings, Webhooks, add your URL, pick events and send a test." },
  ],
  faqs: [
    { q: "Which plans include the API?", a: "Starter, Growth, Pro and Enterprise. The Solo plan doesn't include API access." },
    { q: "How many numbers can a bulk send reach?", a: "Up to 100 recipients per request." },
    { q: "How do I verify a webhook?", a: "Each delivery has an X-Webhook-Signature header: an HMAC-SHA256 of the timestamp and body, made with your webhook secret, which starts with whsec_." },
    { q: "What if my server is down?", a: "Failed deliveries are retried with growing delays, 5 times by default and up to 10. After 10 failures in a row the webhook is paused." },
  ],
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
