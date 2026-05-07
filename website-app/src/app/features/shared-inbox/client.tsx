"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const convs = [
  {
    name: "Ananya Sharma",
    preview: "What's the delivery timeline?",
    time: "2m ago",
    unread: 2,
    avatar: "AS",
    online: true,
    messages: [
      { from: "contact", text: "Hi, I placed an order yesterday. When will it arrive?" },
      { from: "agent",   text: "Hello Ananya! Your order is being processed. Estimated delivery is 2–3 business days." },
      { from: "contact", text: "What's the delivery timeline exactly?" },
    ],
  },
  {
    name: "Vikram Patel",
    preview: "Can I get a refund?",
    time: "15m ago",
    unread: 0,
    avatar: "VP",
    online: false,
    messages: [
      { from: "contact", text: "I want to return the product I bought last week." },
      { from: "agent",   text: "Hi Vikram! I'll help you with the return. Can you share your order ID?" },
      { from: "contact", text: "Can I get a refund instead of a replacement?" },
    ],
  },
  {
    name: "Sneha Rao",
    preview: "Thanks, that helped!",
    time: "1h ago",
    unread: 0,
    avatar: "SR",
    online: false,
    messages: [
      { from: "contact", text: "I couldn't log in to my account." },
      { from: "agent",   text: "Hi Sneha! Please try resetting your password from the login page." },
      { from: "contact", text: "Thanks, that helped!" },
    ],
  },
  {
    name: "Karan Mehta",
    preview: "When is the sale?",
    time: "3h ago",
    unread: 1,
    avatar: "KM",
    online: true,
    messages: [
      { from: "contact", text: "Hey, I heard there's a sale coming up?" },
      { from: "agent",   text: "Yes! Our annual sale starts next Friday with up to 40% off." },
      { from: "contact", text: "When is the sale exactly?" },
    ],
  },
];

function InboxMockup() {
  const [selectedConv, setSelectedConv] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSelectedConv(prev => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(id);
  }, []);
  const conv = convs[selectedConv];

  return (
    <div>
      {/* Section header */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b", marginBottom: 8 }}>
        See it in action
      </p>
      <h3 style={{ fontSize: 32, fontWeight: 700, color: "#ffffff", margin: 0 }}>
        Your team&apos;s shared inbox.
      </h3>

      {/* Mockup container */}
      <div style={{ background: "#1c1b1b", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: 32 }}>

        {/* App chrome bar */}
        <div style={{ background: "#131313", height: 36, display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", height: 520 }}>

          {/* LEFT PANEL */}
          <div style={{ width: 280, flexShrink: 0, background: "#0e0e0e", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>

            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Inbox</span>
              <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
            </div>

            {/* Search */}
            <div style={{ margin: "8px 12px" }}>
              <input
                placeholder="Search..."
                style={{ background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#e5e2e1", width: "100%", outline: "none", boxSizing: "border-box" }}
                readOnly
              />
            </div>

            {/* Conversation list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {convs.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedConv(i)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: selectedConv === i ? "rgba(255,183,125,0.1)" : "transparent",
                    borderLeft: selectedConv === i ? "2px solid #ffb77d" : "2px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (selectedConv !== i) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={e => {
                    if (selectedConv !== i) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* Avatar + online dot */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#554336,#d97707)", borderRadius: "50%", fontSize: 11, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.avatar}
                      </div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: c.online ? "#22c55e" : "transparent", border: "2px solid #0e0e0e" }} />
                    </div>

                    {/* Text column */}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: "rgba(229,226,225,0.4)", marginLeft: "auto", whiteSpace: "nowrap", paddingLeft: 4 }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(229,226,225,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{c.preview}</div>
                    </div>

                    {/* Unread badge */}
                    {c.unread > 0 && (
                      <div style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {c.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

            {/* Chat header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#554336,#d97707)", borderRadius: "50%", fontSize: 12, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {conv.avatar}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{conv.name}</div>
                <div style={{ fontSize: 11, color: "rgba(229,226,225,0.45)", marginTop: 1 }}>Assigned to: Priya ▾</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: conv.online ? "#22c55e" : "rgba(229,226,225,0.25)", flexShrink: 0 }} />
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {conv.messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.from === "agent" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    background: msg.from === "agent" ? "#d97707" : "rgba(255,255,255,0.07)",
                    color: msg.from === "agent" ? "#4d2600" : "#e5e2e1",
                    borderRadius: msg.from === "agent" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    padding: "10px 14px",
                    fontSize: 13,
                    maxWidth: "75%",
                    lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input bar */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, alignItems: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b", cursor: "pointer" }}>attach_file</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b", cursor: "pointer" }}>photo_camera</span>
              <input
                placeholder="Type a message..."
                style={{ flex: 1, background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#e5e2e1", outline: "none" }}
                readOnly
              />
              <button style={{ background: "#ffb77d", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#4d2600" }}>send</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "shared-inbox",
  tag: "Shared Inbox",
  heroTitle: "Your whole team.<br /><span style=\"color:#ffb77d\">One inbox.</span>",
  heroSubtitle: "Every WhatsApp conversation — routed, assigned, and resolved from a single shared workspace. No lead ever falls through again.",
  heroScreen: "/screens/01-inbox-shared-team.png",
  overviewTitle: "One inbox. Zero chaos.",
  overviewDesc: "When your team manages customer conversations across personal WhatsApp numbers, messages get missed and accountability disappears. Wazelo CRM's shared inbox gives every agent a unified view — with real-time routing, clear ownership, and full conversation history — so your team can deliver fast, consistent support at scale.",
  capabilities: [
    { icon: "forum", title: "Unified conversation view", desc: "All incoming WhatsApp messages appear in one shared queue. No agent works in isolation." },
    { icon: "assignment_ind", title: "Smart assignment", desc: "Route conversations by agent, team, or keyword rules. Manual or automatic — you choose." },
    { icon: "swap_horiz", title: "Transfer & escalate", desc: "Hand off conversations between agents with full context preserved. No customer ever has to repeat themselves." },
    { icon: "check_circle", title: "Resolve & reopen", desc: "Mark conversations resolved when done. Reopen instantly if the customer follows up." },
    { icon: "visibility", title: "Live agent presence", desc: "See who is online, who is typing, and which conversations are being handled right now." },
    { icon: "history", title: "Full conversation history", desc: "Every message, note, and file ever exchanged — searchable, forever. Context at your fingertips." },
  ],
  howItWorks: [
    { step: "01", title: "Connect your WhatsApp Business number", desc: "Link your Meta-approved WhatsApp Business API number to Wazelo CRM in under 5 minutes." },
    { step: "02", title: "Invite your team", desc: "Add agents and set their roles. Admins get full access; agents see only their assigned conversations." },
    { step: "03", title: "Set routing rules", desc: "Define how incoming messages are assigned — round-robin, keyword-based, or manual." },
    { step: "04", title: "Reply, resolve, grow", desc: "Your team works from the shared inbox — responding faster, collaborating better, and never missing a message." },
  ],
  screens: [
    { src: "/screens/05-contacts-management.png", caption: "Contact profiles linked to conversations" },
    { src: "/screens/09-csat-surveys.png", caption: "Automatic CSAT surveys after resolution" },
  ],
  relatedFeatures: [
    { label: "Bulk Campaigns", href: "/features/campaigns", icon: "campaign" },
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "CSAT Surveys", href: "/features/csat", icon: "star_rate" },
    { label: "Multi-Channel", href: "/features/multi-channel", icon: "devices" },
  ],
  interactiveSection: <InboxMockup />,
};

export default function SharedInboxClient() {
  return <FeatureDetailPage data={data} />;
}
