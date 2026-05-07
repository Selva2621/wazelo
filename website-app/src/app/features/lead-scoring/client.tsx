"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const leads = [
  { name: "Karan Mehta",   phone: "+91 98765 43210", score: 91, tags: ["opened", "replied", "hasPhone", "isLead"], last: "5m ago" },
  { name: "Ananya Sharma", phone: "+91 87654 32109", score: 78, tags: ["opened", "hasPhone", "isLead"],            last: "30m ago" },
  { name: "Rohan Verma",   phone: "+91 76543 21098", score: 62, tags: ["replied", "hasPhone"],                     last: "2h ago" },
  { name: "Priya Nair",    phone: "+91 65432 10987", score: 45, tags: ["opened"],                                  last: "1d ago" },
  { name: "Sneha Rao",     phone: "+91 54321 09876", score: 22, tags: ["unresponsive"],                            last: "2w ago" },
];

const rules = [
  { id: "opened",       label: "+20 Opened message",       points: "+20", matchTag: "opened",       color: "#34d399" },
  { id: "replied",      label: "+15 Replied within 5min",  points: "+15", matchTag: "replied",      color: "#34d399" },
  { id: "hasPhone",     label: "+10 Has phone number",     points: "+10", matchTag: "hasPhone",     color: "#34d399" },
  { id: "isLead",       label: "+5 Tagged as Lead",        points: "+5",  matchTag: "isLead",       color: "#34d399" },
  { id: "unresponsive", label: "−10 Unresponsive 7 days",  points: "−10", matchTag: "unresponsive", color: "#ef4444" },
];

const avatarGradients = [
  "linear-gradient(135deg, #554336, #d97707)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
  "linear-gradient(135deg, #3b82f6, #d97707)",
];

function getScoreBadgeStyle(score: number): React.CSSProperties {
  if (score >= 70) {
    return {
      background: "rgba(52,211,153,0.12)",
      color: "#34d399",
      border: "1px solid rgba(52,211,153,0.3)",
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  } else if (score >= 40) {
    return {
      background: "rgba(251,191,36,0.12)",
      color: "#fbbf24",
      border: "1px solid rgba(251,191,36,0.3)",
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  } else {
    return {
      background: "rgba(239,68,68,0.12)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.3)",
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  }
}

function LeadScoringMockup() {
  const [hoveredRule, setHoveredRule] = useState<string | null>(null);

  const ruleCycle = ["opened", "replied", "hasPhone", "isLead", "unresponsive", null] as const;
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % ruleCycle.length;
      setHoveredRule(ruleCycle[i] as string | null);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#ffb77d", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          See it in action
        </span>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 0 0" }}>
        Score leads automatically.
      </h3>

      <div style={{
        background: "#1c1b1b",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        overflow: "hidden",
        marginTop: 32,
      }}>
        {/* App chrome bar */}
        <div style={{
          background: "#13131f",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
            wazelo.in — Lead Scoring
          </span>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 380 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: "20px 20px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
              Leads — Sorted by Score
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {leads.map((lead, i) => {
                const isHighlighted = !hoveredRule || lead.tags.includes(hoveredRule);
                return (
                  <div
                    key={lead.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      opacity: isHighlighted ? 1 : 0.25,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#2a2a2a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.35)",
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: avatarGradients[i % avatarGradients.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}>
                      {lead.name.split(" ").map(n => n[0]).join("")}
                    </div>

                    {/* Name + phone */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{lead.phone}</div>
                    </div>

                    {/* Score badge */}
                    <div style={getScoreBadgeStyle(lead.score)}>
                      {lead.score}
                    </div>

                    {/* Last active */}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right", minWidth: 60 }}>
                      {lead.last}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 240, flexShrink: 0, padding: "20px 18px", background: "#131313" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
              Scoring Rules
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rules.map((rule) => {
                const isActive = hoveredRule === rule.matchTag;
                const isPositive = rule.points.startsWith("+");
                return (
                  <div
                    key={rule.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isActive ? "rgba(255,183,125,0.1)" : "#2a2a2a",
                      border: isActive ? "1px solid rgba(255,183,125,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      transition: "background 0.15s, border 0.15s",
                    }}
                    onMouseEnter={() => setHoveredRule(rule.matchTag)}
                    onMouseLeave={() => setHoveredRule(null)}
                  >
                    <div style={{
                      width: 48,
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: rule.color,
                      background: isPositive ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
                      borderRadius: 6,
                      padding: "3px 6px",
                      flexShrink: 0,
                    }}>
                      {rule.points}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>
                      {rule.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 16, textAlign: "center" }}>
              Hover a rule to highlight matching leads
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "lead-scoring",
  tag: "Lead Scoring",
  heroTitle: "Know who to call<br /><span style=\"color:#ffb77d\">first. Always.</span>",
  heroSubtitle: "Automatic lead scoring based on engagement, profile completeness, and behaviour — so your team focuses on the hottest leads, not the longest queue.",
  heroScreen: "",
  overviewTitle: "Not every lead deserves equal attention.",
  overviewDesc: "When 300 contacts message you in a day, your team can't treat them all equally. Wazelo CRM's lead scoring engine assigns a score to every contact based on their WhatsApp engagement, how complete their profile is, which campaigns they responded to, and whether they've been tagged as qualified. High-score leads rise to the top. Low-score leads wait their turn.",
  capabilities: [
    { icon: "query_stats", title: "Automatic score calculation", desc: "Scores are calculated continuously based on engagement signals — no manual input required." },
    { icon: "tune", title: "Configurable scoring rules", desc: "Set which actions add or subtract score points: replied to campaign, opened chatbot, tag added, field filled." },
    { icon: "sort", title: "Sorted inbox view", desc: "Sort your inbox by lead score so agents always work the highest-value conversations first." },
    { icon: "label", title: "Score-based tagging", desc: "Automatically tag contacts as 'Hot', 'Warm', or 'Cold' when their score crosses a threshold." },
    { icon: "bolt", title: "Trigger automations on score", desc: "Use lead score as a workflow trigger — enrol a hot lead in a sequence, or alert a senior agent." },
    { icon: "insights", title: "Score distribution report", desc: "See how your lead base is distributed across score ranges. Identify bottlenecks in your qualification funnel." },
  ],
  howItWorks: [
    { step: "01", title: "Define your scoring rules", desc: "Set which signals increase or decrease a lead's score. Examples: +20 for replying to a campaign, +10 for filling a custom field, -15 for 7 days of no response." },
    { step: "02", title: "Scores update automatically", desc: "As contacts engage or disengage, their scores update in real time. No manual scoring or spreadsheet maintenance." },
    { step: "03", title: "Surface high-priority leads", desc: "Sort the inbox or contact list by score. Agents always see which conversations are worth the most attention." },
    { step: "04", title: "Act on score thresholds", desc: "When a contact crosses a score threshold, trigger an automation: enrol in a sequence, assign to a senior agent, or send an alert." },
  ],
  screens: [],
  relatedFeatures: [
    { label: "Contacts CRM", href: "/features/contacts", icon: "group" },
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Sequences", href: "/features/sequences", icon: "low_priority" },
    { label: "Deals Pipeline", href: "/features/deals", icon: "trending_up" },
  ],
  interactiveSection: <LeadScoringMockup />,
};

export default function LeadScoringClient() {
  return <FeatureDetailPage data={data} />;
}
