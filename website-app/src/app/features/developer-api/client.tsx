"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/developer/messages/send",
    request: `{
  "to": "+919876543210",
  "type": "text",
  "body": "Hi Priya, thanks for your enquiry."
}`,
    response: `{
  "success": true,
  "data": {
    "message": {
      "id": "3f9c…",
      "to": "+919876543210",
      "type": "text",
      "status": "QUEUED"
    }
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/developer/contacts?search=priya",
    request: `// Matches name, phone or email
// Filter by leadStatus, page with cursor`,
    response: `{
  "success": true,
  "data": {
    "data": [
      {
        "id": "7a1e…",
        "name": "Priya",
        "phoneNumber": "+919876543210",
        "leadStatus": "INTERESTED"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/developer/contacts/:id/notes",
    request: `{
  "content": "Asked for a quote. Call back Monday."
}`,
    response: `{
  "success": true,
  "data": {
    "id": "c4d2…",
    "content": "Asked for a quote. Call back Monday.",
    "createdAt": "…"
  }
}`,
  },
  {
    method: "PUT",
    path: "/api/v1/developer/deals/:id/stage",
    request: `{
  "stageId": "b81f…"
}`,
    response: `{
  "success": true,
  "data": {
    "id": "9e07…",
    "title": "Website redesign",
    "stage": { "name": "Proposal sent" }
  }
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
        A REST API for your leads.
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
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>{ep.path.replace("/api/v1/developer", "")}</span>
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
  heroTitle: "Build on<br /><span style=\"color:#ffb77d\">your Wazelo data.</span>",
  heroSubtitle: "A REST API, webhooks and an MCP server. Connect Wazelo to your own tools or to an AI agent.",
  heroScreen: "",
  overviewTitle: "Your leads, in your tools.",
  overviewDesc: "Search contacts, add notes and tags, read conversations and move deals from your own code. Webhooks tell your systems the moment something changes.",
  capabilities: [
    { icon: "search", title: "Contacts and search", desc: "Find contacts by name, phone or email, and create or update them." },
    { icon: "sticky_note_2", title: "Notes and tags", desc: "Read and add notes, and tag or untag contacts." },
    { icon: "forum", title: "Conversations", desc: "List conversations and read their messages." },
    { icon: "view_kanban", title: "Deals", desc: "List pipelines and deals, and move a deal to another stage." },
    { icon: "send", title: "Send messages", desc: "Send WhatsApp text and approved templates from your code." },
    { icon: "webhook", title: "Webhooks", desc: "Get events for messages, contacts, lead status, tags, notes, assignments, conversations and deals." },
    { icon: "smart_toy", title: "MCP server", desc: "Let Claude and other AI agents search, update and message your contacts." },
    { icon: "key", title: "Scoped API keys", desc: "Each key gets only the scopes you choose, and you can revoke it any time." },
  ],
  howItWorks: [
    { step: "01", title: "Create an API key", desc: "Open Settings → API keys, pick its scopes and copy the key." },
    { step: "02", title: "Call the API", desc: "Send the key as a Bearer token. The full reference is at /api-reference." },
    { step: "03", title: "Add a webhook", desc: "Choose the events you want and we post them to your URL." },
    { step: "04", title: "Or connect an AI agent", desc: "Add the Wazelo MCP server to Claude, Cursor or any MCP client with the same key." },
  ],
  screens: [],
  interactiveSection: <ApiMockup />,
  relatedFeatures: [
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Contacts", href: "/features/contacts", icon: "group" },
    { label: "Deals", href: "/features/deals", icon: "view_kanban" },
    { label: "AI assistant", href: "/features/ai-assistant", icon: "auto_awesome" },
  ],
};

export default function DeveloperApiClient() {
  return <FeatureDetailPage data={data} />;
}
