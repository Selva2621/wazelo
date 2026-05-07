"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── CampaignMockup ───────────────────────────────────────────────────────────
function CampaignMockup() {
  const [selectedAudience, setSelectedAudience] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSelectedAudience(prev => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const audiences = [
    { label: "All Contacts",    count: "2,847", desc: "Your entire contact list" },
    { label: "Tagged: Hot Lead", count: "412",   desc: "Contacts tagged as hot leads" },
    { label: "Custom Segment",  count: "88",    desc: "Manually selected contacts" },
  ];

  const stats = [
    { icon: "send",       label: "Sent",      value: "8,432" },
    { icon: "done_all",   label: "Delivered", value: "7,910" },
    { icon: "visibility", label: "Read",      value: "5,204" },
    { icon: "reply",      label: "Replied",   value: "1,847" },
  ];

  const FONT = "'Inter', sans-serif";

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

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 440 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: 24, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: FONT, margin: "0 0 20px" }}>
              New Campaign
            </p>

            {/* Audience label */}
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#ffb77d", fontFamily: FONT, display: "block", marginBottom: 10 }}>
              Audience
            </span>

            {/* Audience chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {audiences.map((aud, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAudience(i)}
                  style={{
                    background: selectedAudience === i ? "rgba(255,183,125,0.12)" : "#2a2a2a",
                    border: selectedAudience === i ? "1px solid #ffb77d" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedAudience === i ? "#fff" : "rgba(219,194,176,0.5)", fontFamily: FONT }}>
                      {aud.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, background: "rgba(255,183,125,0.1)", color: "#ffb77d", padding: "1px 8px", borderRadius: 6, fontFamily: FONT }}>
                      {aud.count}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(219,194,176,0.35)", fontFamily: FONT }}>
                    {aud.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Message Preview label */}
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#ffb77d", fontFamily: FONT, display: "block", marginBottom: 10 }}>
              Message Preview
            </span>

            {/* Message preview box */}
            <div style={{ background: "#0e0e0e", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ background: "#2a2a2a", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: 13, color: "#e5e2e1", lineHeight: 1.6, fontFamily: FONT }}>
                <span>Hi </span>
                <span style={{ background: "rgba(255,183,125,0.2)", color: "#ffb77d", padding: "1px 4px", borderRadius: 3 }}>{`{{name}}`}</span>
                <span>, we have an exclusive offer just for you! 🎉</span>
                <br /><br />
                <span>Use code </span>
                <span style={{ background: "rgba(255,183,125,0.2)", color: "#ffb77d", padding: "1px 4px", borderRadius: 3 }}>WAZELO20</span>
                <span> for 20% off your next order.</span>
                <div style={{ fontSize: 10, color: "rgba(219,194,176,0.35)", textAlign: "right", marginTop: 6, fontFamily: FONT }}>
                  Wazelo CRM • now&nbsp;&nbsp;✓✓
                </div>
              </div>
            </div>

            {/* Schedule row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ flex: 1, background: "#ffb77d", color: "#4d2600", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT }}>
                Send Now
              </button>
              <button style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(219,194,176,0.6)", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                Schedule
              </button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 260, flexShrink: 0, padding: 24, background: "#131313" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT, margin: "0 0 20px" }}>
              Live Results
            </p>

            {/* Progress ring */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg viewBox="0 0 120 120" width={120} height={120}>
                <circle cx={60} cy={60} r={50} stroke="#2a2a2a" strokeWidth={10} fill="none" />
                <circle
                  cx={60} cy={60} r={50}
                  stroke="#ffb77d" strokeWidth={10} fill="none"
                  strokeDasharray="314"
                  strokeDashoffset="28.26"
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="-8" fontSize={14} fontWeight={700} fill="#fff" fontFamily={FONT}>91%</text>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="10" fontSize={10} fill="rgba(219,194,176,0.4)" fontFamily={FONT}>Delivered</text>
              </svg>
            </div>

            {/* Stats list */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 0 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ffb77d" }}>{s.icon}</span>
                  <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: FONT }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT, marginLeft: "auto" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Audience summary */}
            <div style={{ marginTop: 20, padding: "10px 12px", background: "rgba(255,183,125,0.08)", borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: FONT }}>Sending to </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: FONT }}>{audiences[selectedAudience].count}</span>
              <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", fontFamily: FONT }}> contacts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "campaigns",
  tag: "Bulk Campaigns",
  heroTitle: "Reach thousands.<br /><span style=\"color:#ffb77d\">One click.</span>",
  heroSubtitle: "Schedule and send personalised WhatsApp broadcasts to segmented contact lists. Track delivery, opens, and replies in real time.",
  heroScreen: "/screens/02-campaigns-broadcast.png",
  overviewTitle: "Campaigns that actually get read.",
  overviewDesc: "Email open rates hover around 20%. WhatsApp messages get read 98% of the time — usually within 3 minutes. Wazelo CRM's campaign engine lets you broadcast to your entire contact list or a targeted segment, personalise each message with contact fields, and track every delivery and reply as it happens.",
  capabilities: [
    { icon: "campaign", title: "Broadcast to segments", desc: "Send to your full list or a filtered segment — by tag, location, last interaction, or custom field." },
    { icon: "person", title: "Personalised messages", desc: "Merge contact fields into your message: name, city, order number, or any custom attribute." },
    { icon: "schedule", title: "Scheduled sending", desc: "Set campaigns to send at the optimal time — even if that's 3am. We'll deliver it." },
    { icon: "repeat", title: "Smart retry logic", desc: "Failed deliveries are automatically retried. No message is dropped without logging the reason." },
    { icon: "insights", title: "Real-time delivery tracking", desc: "Live dashboard showing sent, delivered, read, and replied counts as they update." },
    { icon: "star_rate", title: "CSAT follow-ups", desc: "Automatically send a satisfaction survey after a campaign interaction completes." },
  ],
  howItWorks: [
    { step: "01", title: "Import or build your contact list", desc: "Upload a CSV or use contacts already in your CRM. Apply filters to target the right segment." },
    { step: "02", title: "Create your message template", desc: "Write your message using our editor. Use {{name}} and other variables for personalisation. Submit for Meta approval if needed." },
    { step: "03", title: "Schedule and launch", desc: "Pick a send time or launch immediately. Wazelo handles rate limiting and queuing automatically." },
    { step: "04", title: "Track and optimise", desc: "Monitor delivery and reply rates live. Filter replies into your shared inbox for follow-up." },
  ],
  screens: [
    { src: "/screens/04-analytics-dashboard.png", caption: "Campaign analytics dashboard" },
  ],
  relatedFeatures: [
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Sequences", href: "/features/sequences", icon: "low_priority" },
    { label: "Lead Scoring", href: "/features/lead-scoring", icon: "query_stats" },
  ],
  interactiveSection: <CampaignMockup />,
};

export default function CampaignsClient() {
  return <FeatureDetailPage data={data} />;
}
