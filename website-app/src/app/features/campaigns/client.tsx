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
    { label: "From Scraper Run", count: "88",   desc: "Google Maps run, imported leads" },
  ];

  const stats = [
    { icon: "send",       label: "Sent",      value: "8,432" },
    { icon: "done_all",   label: "Delivered", value: "7,910" },
    { icon: "visibility", label: "Read",      value: "5,204" },
    { icon: "error",      label: "Failed",    value: "96" },
  ];

  const FONT = "var(--font-geist-sans), sans-serif";

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: FONT, display: "block", marginBottom: 12 }}>
          See it in action
        </span>
        <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c-on-surface)", fontFamily: FONT, margin: 0 }}>
          Build and send campaigns.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{ background: "var(--c-surface-container-lowest)", borderRadius: 16, boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)", overflow: "hidden", marginTop: 32 }}>

        {/* App chrome bar */}
        <div style={{ background: "var(--c-surface)", height: 36, display: "flex", alignItems: "center", padding: "0 14px", gap: 7, flexShrink: 0 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28ca41", display: "inline-block" }} />
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 440 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: 24, borderRight: "1px solid rgb(var(--fx-ink) / 0.06)" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: FONT, margin: "0 0 20px" }}>
              New Campaign
            </p>

            {/* Audience label */}
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: FONT, display: "block", marginBottom: 10 }}>
              Audience
            </span>

            {/* Audience chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {audiences.map((aud, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAudience(i)}
                  style={{
                    background: selectedAudience === i ? "rgb(var(--fx-accent) / 0.12)" : "var(--c-surface-container-high)",
                    border: selectedAudience === i ? "1px solid var(--c-primary-container)" : "1px solid rgb(var(--fx-ink) / 0.08)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedAudience === i ? "var(--c-on-surface)" : "var(--c-on-surface-variant)", fontFamily: FONT }}>
                      {aud.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, background: "rgb(var(--fx-accent) / 0.1)", color: "var(--c-primary-container)", padding: "1px 8px", borderRadius: 6, fontFamily: FONT }}>
                      {aud.count}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--c-placeholder)", fontFamily: FONT }}>
                    {aud.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Message Preview label */}
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--c-primary-container)", fontFamily: FONT, display: "block", marginBottom: 10 }}>
              Message Preview
            </span>

            {/* Message preview box */}
            <div style={{ background: "var(--c-surface)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ background: "var(--c-surface-container-high)", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: 13, color: "var(--c-on-surface)", lineHeight: 1.6, fontFamily: FONT }}>
                <span>Hi </span>
                <span style={{ background: "rgb(var(--fx-accent) / 0.2)", color: "var(--c-primary-container)", padding: "1px 4px", borderRadius: 3 }}>{`{{name}}`}</span>
                <span>, we have an exclusive offer just for you! 🎉</span>
                <br /><br />
                <span>Use code </span>
                <span style={{ background: "rgb(var(--fx-accent) / 0.2)", color: "var(--c-primary-container)", padding: "1px 4px", borderRadius: 3 }}>WAZELO20</span>
                <span> for 20% off your next order.</span>
                <div style={{ fontSize: 10, color: "var(--c-placeholder)", textAlign: "right", marginTop: 6, fontFamily: FONT }}>
                  Wazelo CRM • now&nbsp;&nbsp;✓✓
                </div>
              </div>
            </div>

            {/* Schedule row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ flex: 1, background: "var(--c-primary-container)", color: "var(--c-on-primary)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT }}>
                Send Now
              </button>
              <button style={{ flex: 1, background: "transparent", border: "1px solid rgb(var(--fx-ink) / 0.15)", color: "var(--c-on-surface-variant)", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                Schedule
              </button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 260, flexShrink: 0, padding: 24, background: "var(--c-surface)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: FONT, margin: "0 0 20px" }}>
              Live Results
            </p>

            {/* Progress ring */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg viewBox="0 0 120 120" width={120} height={120}>
                <circle cx={60} cy={60} r={50} stroke="var(--c-surface-container-high)" strokeWidth={10} fill="none" />
                <circle
                  cx={60} cy={60} r={50}
                  stroke="var(--c-primary-container)" strokeWidth={10} fill="none"
                  strokeDasharray="314"
                  strokeDashoffset="28.26"
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="-8" fontSize={14} fontWeight={700} fill="var(--c-on-surface)" fontFamily={FONT}>91%</text>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="10" fontSize={10} fill="var(--c-placeholder)" fontFamily={FONT}>Delivered</text>
              </svg>
            </div>

            {/* Stats list */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 0 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < stats.length - 1 ? "1px solid rgb(var(--fx-ink) / 0.04)" : "none" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--c-primary-container)" }}>{s.icon}</span>
                  <span style={{ fontSize: 12, color: "var(--c-placeholder)", fontFamily: FONT }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: FONT, marginLeft: "auto" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Audience summary */}
            <div style={{ marginTop: 20, padding: "10px 12px", background: "rgb(var(--fx-accent) / 0.08)", borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: "var(--c-placeholder)", fontFamily: FONT }}>Sending to </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: FONT }}>{audiences[selectedAudience].count}</span>
              <span style={{ fontSize: 12, color: "var(--c-placeholder)", fontFamily: FONT }}> contacts</span>
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
  heroTitle: "Reach thousands.<br /><span style=\"color:var(--c-primary-container)\">One click.</span>",
  heroSubtitle: "Send one WhatsApp message to a filtered list, personalised for each contact. Track Delivered, Read and Failed per person.",
  overviewTitle: "Pick the audience, then press send.",
  overviewDesc: "Write a text, image, video, document or audio message. Filter your contacts by lead status, tags, source, products or a lead scraper run, and preview how many people it will reach. Wazelo sends in small batches to protect your number, skips anyone who opted out, and shows each recipient's status live while the campaign runs.",
  capabilities: [
    { icon: "campaign", title: "Filtered audiences", desc: "Send to All Contacts, or filter by Lead Status, Source, Tags, Products or a scraper run. Preview Audience shows the count before you send." },
    { icon: "perm_media", title: "Text or media", desc: "Send text, or an image, video, document or audio file from a media URL." },
    { icon: "person", title: "Personalised fields", desc: "Insert {{name}}, {{phone}}, {{email}} or {{leadStatus}} and every contact gets their own version." },
    { icon: "schedule", title: "Send now or schedule", desc: "Launch right away, or pick a date and time to send later." },
    { icon: "pause_circle", title: "Pause, resume, cancel", desc: "Stop a running campaign at any point and pick it back up when you're ready." },
    { icon: "insights", title: "Status for every recipient", desc: "Delivered, Read and Failed counts update live, with a list of every recipient and their status." },
  ],
  details: [
    { title: "Audience filters", items: ["Lead Status", "Source", "Tags", "Products", "From Scraper Run", "Has phone", "Has website", "Added in the last 7, 30 or 90 days", "Rating 3.0+ to 4.5+"] },
    { title: "Personalisation", items: ["{{name}}", "{{phone}}", "{{email}}", "{{leadStatus}}"] },
    { title: "Sending safeguards", items: ["Batches of 50", "30 messages a minute per number", "Opted-out contacts skipped", "Duplicate numbers removed", "Invalid numbers dropped", "3 automatic retries"] },
  ],
  howItWorks: [
    { step: "01", title: "Write the message", desc: "Click New Campaign and write your text or add media, or start from a saved template." },
    { step: "02", title: "Choose who gets it", desc: "Filter your contacts and click Preview Audience to see how many people it will reach." },
    { step: "03", title: "Send now or schedule", desc: "Pick the WhatsApp number to send from, then launch now or at a set time." },
    { step: "04", title: "Watch it deliver", desc: "Track Delivered, Read and Failed live, and pause or cancel if you need to." },
  ],
  faqs: [
    { q: "How many campaigns can I send?", a: "Per month: 5 on Solo and the free trial, 10 on Starter, 50 on Growth, 200 on Pro, and unlimited on Enterprise." },
    { q: "Will bulk sending get my number banned?", a: "Wazelo spaces sends out, in batches of 50 at up to 30 messages a minute per number, and skips opted-out contacts. Messaging only people who know your business is still the best way to protect your number." },
    { q: "Do I need Meta-approved templates?", a: "No. Your number is linked by QR, so you write messages directly. Saved templates just fill in the message text for you." },
    { q: "Who can create campaigns?", a: "Admins and Managers." },
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
