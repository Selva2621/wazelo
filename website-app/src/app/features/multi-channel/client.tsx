"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── MultiChannelMockup ───────────────────────────────────────────────────────
function MultiChannelMockup() {
  const [activeChannel, setActiveChannel] = useState<"all" | "whatsapp" | "instagram" | "messenger" | "email">("all");

  const channelCycle = ["all", "whatsapp", "instagram", "messenger", "email"] as const;
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % channelCycle.length;
      setActiveChannel(channelCycle[i]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const FONT = "'Inter', sans-serif";

  const channels: { id: "all" | "whatsapp" | "instagram" | "messenger" | "email"; label: string; color: string; bg: string }[] = [
    { id: "all",       label: "All",       color: "#e5e2e1",  bg: "rgba(255,255,255,0.1)" },
    { id: "whatsapp",  label: "WhatsApp",  color: "#22c55e",  bg: "rgba(34,197,94,0.12)" },
    { id: "instagram", label: "Instagram", color: "#e1306c",  bg: "rgba(225,48,108,0.12)" },
    { id: "messenger", label: "Messenger", color: "#0084ff",  bg: "rgba(0,132,255,0.12)" },
    { id: "email",     label: "Email",     color: "#94a3b8",  bg: "rgba(148,163,184,0.12)" },
  ];

  const conversations: { channel: "whatsapp" | "instagram" | "messenger" | "email"; name: string; preview: string; time: string; avatar: string; unread: number }[] = [
    { channel: "whatsapp",  name: "Ananya Sharma", preview: "Is the offer still valid?",  time: "2m",  avatar: "AS", unread: 2 },
    { channel: "instagram", name: "Rohan Verma",   preview: "Loved the product! DM me",  time: "8m",  avatar: "RV", unread: 1 },
    { channel: "whatsapp",  name: "Priya Nair",    preview: "Order confirmed, thanks!",   time: "22m", avatar: "PN", unread: 0 },
    { channel: "messenger", name: "Vikram Patel",  preview: "When does shipping start?",  time: "1h",  avatar: "VP", unread: 0 },
    { channel: "instagram", name: "Meera Joshi",   preview: "Can you DM me the price?",  time: "2h",  avatar: "MJ", unread: 3 },
    { channel: "email",     name: "Karan Mehta",   preview: "Re: Support ticket #2847",   time: "3h",  avatar: "KM", unread: 0 },
  ];

  const channelColorMap: Record<string, string> = {
    whatsapp:  "#22c55e",
    instagram: "#e1306c",
    messenger: "#0084ff",
    email:     "#94a3b8",
  };

  // Avatar gradient based on first letter
  const avatarGradients: Record<string, string> = {
    A: "linear-gradient(135deg,#554336,#d97707)",
    R: "linear-gradient(135deg,#e1306c,#f472b6)",
    P: "linear-gradient(135deg,#22c55e,#16a34a)",
    V: "linear-gradient(135deg,#0084ff,#3b82f6)",
    M: "linear-gradient(135deg,#f59e0b,#d97706)",
    K: "linear-gradient(135deg,#94a3b8,#64748b)",
  };

  const filtered = activeChannel === "all" ? conversations : conversations.filter(c => c.channel === activeChannel);

  const connectedChannels = [
    { id: "whatsapp",  color: "#22c55e" },
    { id: "instagram", color: "#e1306c" },
    { id: "messenger", color: "#0084ff" },
    { id: "email",     color: "#94a3b8" },
  ];

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb77d", fontFamily: FONT, display: "block", marginBottom: 12 }}>
          See it in action
        </span>
        <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", fontFamily: FONT, margin: 0 }}>
          Build and send campaigns.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{ background: "#1c1b1b", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: 32 }}>

        {/* App chrome bar */}
        <div style={{ background: "#131313", height: 36, display: "flex", alignItems: "center", padding: "0 14px", gap: 7, flexShrink: 0 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28ca41", display: "inline-block" }} />
        </div>

        {/* Content */}
        <div style={{ padding: 0 }}>

          {/* Channel tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 16px", gap: 4, overflowX: "auto" }}>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  padding: "12px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  color: activeChannel === ch.id ? ch.color : "rgba(219,194,176,0.4)",
                  borderBottom: activeChannel === ch.id ? `2px solid ${ch.color}` : "2px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: FONT,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block", opacity: activeChannel === ch.id ? 1 : 0.4 }} />
                {ch.label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div style={{ padding: "8px 0", minHeight: 320 }}>
            {filtered.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "rgba(219,194,176,0.3)", fontSize: 13, fontFamily: FONT }}>
                No conversations
              </div>
            ) : (
              filtered.map((conv, i) => (
                <div key={i} style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  {/* Channel dot */}
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: channelColorMap[conv.channel], display: "inline-block", flexShrink: 0 }} />

                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: avatarGradients[conv.avatar[0]] ?? "linear-gradient(135deg,#554336,#d97707)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: FONT, flexShrink: 0,
                  }}>
                    {conv.avatar}
                  </div>

                  {/* Text column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT }}>{conv.name}</span>
                      <span style={{ fontSize: 11, color: "rgba(219,194,176,0.35)", fontFamily: FONT, flexShrink: 0 }}>{conv.time}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: FONT, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.preview}
                    </span>
                  </div>

                  {/* Unread badge */}
                  {conv.unread > 0 && (
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#ffb77d", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#131313", fontFamily: FONT, flexShrink: 0,
                    }}>
                      {conv.unread}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom status bar */}
        <div style={{ padding: "8px 16px", background: "#0e0e0e", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "rgba(219,194,176,0.35)", fontFamily: FONT }}>
            {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            {connectedChannels.map(ch => (
              <span key={ch.id} title={ch.id} style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "multi-channel",
  tag: "Multi-Channel",
  heroTitle: "Every channel.<br /><span style=\"color:#ffb77d\">One inbox.</span>",
  heroSubtitle: "Manage WhatsApp, Instagram DMs, Facebook Messenger, and Email conversations from a single shared inbox — with the same automations, routing, and analytics across all channels.",
  heroScreen: "",
  overviewTitle: "Your customers don't stay on one channel.",
  overviewDesc: "A lead might find you on Instagram, message on WhatsApp, and follow up by email. Without a unified inbox, your team handles each channel in a different tool — missing context, duplicating work, and delivering inconsistent experiences. Wazelo CRM brings WhatsApp, Instagram DMs, Facebook Messenger, and Email into a single workspace where every conversation is managed, routed, and tracked the same way.",
  capabilities: [
    { icon: "devices", title: "Unified multi-channel inbox", desc: "WhatsApp, Instagram DMs, Facebook Messenger, and Email — all in one shared queue. One workflow, all channels." },
    { icon: "account_tree", title: "Cross-channel routing", desc: "Apply the same assignment rules and automation workflows across all channels. No duplicate setup." },
    { icon: "manage_history", title: "Unified contact timeline", desc: "See every message a contact has ever sent — across all channels — in a single conversation timeline." },
    { icon: "bolt", title: "Multi-channel automations", desc: "Build workflows that trigger and act across channels. Auto-reply on Instagram, follow up on WhatsApp." },
    { icon: "bar_chart", title: "Per-channel analytics", desc: "Volume, response time, and CSAT broken down by channel — so you know where to focus investment." },
    { icon: "verified", title: "Consistent brand experience", desc: "Same tone, same SLAs, same escalation path — regardless of which channel the customer chose." },
  ],
  howItWorks: [
    { step: "01", title: "Connect your channels", desc: "Link your WhatsApp Business number, Instagram account, Facebook Page, and email inbox in the Channels settings. Each connection is authorised via OAuth." },
    { step: "02", title: "All messages arrive in one inbox", desc: "Every incoming message from every connected channel lands in the shared inbox queue — with a channel badge showing its origin." },
    { step: "03", title: "Apply the same rules", desc: "Your routing rules, auto-replies, and automation workflows apply across all channels automatically. Build once, run everywhere." },
    { step: "04", title: "Report across channels", desc: "Your analytics dashboard shows volume, response time, and CSAT for each channel side by side — so you can compare and optimise." },
  ],
  screens: [],
  relatedFeatures: [
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Analytics", href: "/features/analytics", icon: "bar_chart" },
    { label: "Chatbot Builder", href: "/features/chatbot", icon: "smart_toy" },
  ],
  interactiveSection: <MultiChannelMockup />,
};

export default function MultiChannelClient() {
  return <FeatureDetailPage data={data} />;
}
