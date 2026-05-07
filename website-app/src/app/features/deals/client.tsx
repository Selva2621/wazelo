"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── KanbanMockup ─────────────────────────────────────────────────────────────
const columns = [
  { name: "Lead", color: "#94a3b8", total: "₹73,500", deals: [
    { id: 0, name: "Ananya Sharma", value: "₹45,000", owner: "PS", days: "Day 2" },
    { id: 1, name: "Rohan Verma",   value: "₹28,500", owner: "RK", days: "Day 5" },
  ]},
  { name: "Qualified", color: "#d97707", total: "₹1,95,000", deals: [
    { id: 2, name: "Vikram Patel",  value: "₹1,20,000", owner: "MJ", days: "Day 8" },
    { id: 3, name: "Meera Joshi",   value: "₹75,000",   owner: "PS", days: "Day 3" },
  ]},
  { name: "Proposal", color: "#f59e0b", total: "₹2,50,000", deals: [
    { id: 4, name: "Karan Mehta",   value: "₹2,50,000", owner: "AT", days: "Day 12" },
  ]},
  { name: "Won", color: "#22c55e", total: "₹2,40,000", deals: [
    { id: 5, name: "Sneha Rao",     value: "₹90,000",   owner: "RK", days: "Day 18" },
    { id: 6, name: "Divya Nair",    value: "₹1,50,000", owner: "MJ", days: "Day 7"  },
  ]},
];

const dealDetails = [
  { conv: "Conv #1042 — Order inquiry",     activity: ["Stage changed: New → Lead",            "Note added: Interested in Pro plan",          "Follow-up scheduled: Tomorrow 10am"],       closeDate: "Dec 15, 2025" },
  { conv: "Conv #987 — Pricing question",   activity: ["Contact created",                       "Deal created from conversation",              "Tagged: Hot Lead"],                         closeDate: "Jan 8, 2026"  },
  { conv: "Conv #1103 — Enterprise demo",   activity: ["Stage changed: Lead → Qualified",       "Note added: Needs custom invoice",            "Meeting booked: Dec 10"],                   closeDate: "Dec 28, 2025" },
  { conv: "Conv #1055 — Product walkthrough",activity: ["Stage changed: New → Qualified",       "Note added: Decision maker confirmed",        "Tagged: Priority"],                         closeDate: "Jan 15, 2026" },
  { conv: "Conv #1198 — Contract review",   activity: ["Stage changed: Qualified → Proposal",  "Note added: Sent proposal doc",               "Follow-up scheduled: Dec 14"],              closeDate: "Dec 20, 2025" },
  { conv: "Conv #892 — Onboarding call",    activity: ["Stage changed: Proposal → Won",        "Payment confirmed",                           "Onboarding scheduled: Dec 5"],              closeDate: "Nov 30, 2025" },
  { conv: "Conv #944 — Renewal discussion", activity: ["Stage changed: Lead → Won",            "Note added: Existing customer upsell",        "Contract signed"],                          closeDate: "Dec 7, 2025"  },
];

// Gradient pool for owner avatars
const gradients = [
  "linear-gradient(135deg,#554336,#d97707)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)",
  "linear-gradient(135deg,#22c55e,#4ade80)",
  "linear-gradient(135deg,#ec4899,#f472b6)",
];
const ownerGrad: Record<string, string> = {
  PS: gradients[0], RK: gradients[1], MJ: gradients[2], AT: gradients[3],
};

function KanbanMockup() {
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);

  const dealCycle = [0, 1, 2, 3, 4, 5, 6, null] as const;
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % dealCycle.length;
      setSelectedDeal(dealCycle[i] as number | null);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const selected = selectedDeal !== null ? dealDetails[selectedDeal] : null;
  const selectedCol = selectedDeal !== null
    ? columns.find(c => c.deals.some(d => d.id === selectedDeal)) ?? null
    : null;

  return (
    <div>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#ffb77d",
          fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 12,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, letterSpacing: "-0.04em",
          color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 0,
        }}>
          Your pipeline, always in view.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{
        background: "#1c1b1b",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        overflow: "hidden",
        marginTop: 32,
        position: "relative",
      }}>
        {/* App chrome bar */}
        <div style={{
          background: "#131313",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "rgba(219,194,176,0.3)", fontFamily: "'Inter', sans-serif", marginLeft: 10 }}>
            Deals Pipeline — Wazelo CRM
          </span>
        </div>

        {/* Board area */}
        <div style={{ display: "flex", overflow: "hidden" }}>

          {/* Kanban columns */}
          <div style={{ flex: 1, display: "flex", gap: 0, overflowX: "auto", padding: "20px 16px" }}>
            {columns.map((col) => (
              <div key={col.name} style={{ width: 220, flexShrink: 0, marginRight: 12 }}>
                {/* Column header */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>{col.name}</span>
                    <span style={{
                      marginLeft: "auto",
                      background: "rgba(255,255,255,0.07)", borderRadius: 10,
                      padding: "1px 8px", fontSize: 11,
                      color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    }}>
                      {col.deals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(219,194,176,0.4)", fontFamily: "'Inter', sans-serif", paddingLeft: 17 }}>
                    {col.total}
                  </div>
                </div>

                {/* Deal cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.deals.map((deal) => {
                    const isSelected = selectedDeal === deal.id;
                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(isSelected ? null : deal.id)}
                        style={{
                          background: isSelected ? "rgba(255,183,125,0.12)" : "#2a2a2a",
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          border: isSelected ? "1px solid #ffb77d" : "1px solid rgba(255,255,255,0.06)",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#2a2a2a";
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>
                          {deal.name}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: col.color, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                          {deal.value}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {/* Owner avatar */}
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: ownerGrad[deal.owner] ?? "linear-gradient(135deg,#554336,#d97707)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif",
                            flexShrink: 0,
                          }}>
                            {deal.owner}
                          </div>
                          {/* Days badge */}
                          <span style={{
                            background: "rgba(255,255,255,0.06)", borderRadius: 10,
                            padding: "2px 8px", fontSize: 10,
                            color: "rgba(219,194,176,0.45)", fontFamily: "'Inter', sans-serif",
                          }}>
                            {deal.days}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div style={{
            width: 240, flexShrink: 0,
            background: "#131313",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 18px",
          }}>
            {selected === null ? (
              <div style={{
                fontSize: 12, color: "rgba(219,194,176,0.3)",
                fontFamily: "'Inter', sans-serif", textAlign: "center", paddingTop: 40,
              }}>
                ↑ Click a deal to view details
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* Close button */}
                <button
                  onClick={() => setSelectedDeal(null)}
                  style={{
                    position: "absolute", top: 0, right: 0,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, color: "rgba(219,194,176,0.4)", lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>

                {/* Deal Details heading */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
                  Deal Details
                </div>

                {/* Stage badge */}
                {selectedCol && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "#ffb77d",
                      fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 4,
                    }}>
                      STAGE
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: selectedCol.color,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: selectedCol.color, display: "inline-block" }} />
                      {selectedCol.name}
                    </span>
                  </div>
                )}

                {/* Conversation */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#ffb77d",
                    fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 6,
                  }}>
                    CONVERSATION
                  </span>
                  <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                    {selected.conv}
                  </div>
                </div>

                {/* Activity log */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#ffb77d",
                    fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 6,
                  }}>
                    ACTIVITY
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.activity.map((item, i) => (
                      <div key={i} style={{ fontSize: 11, color: "rgba(219,194,176,0.5)", fontFamily: "'Inter', sans-serif", lineHeight: 1.5, display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(219,194,176,0.3)", flexShrink: 0 }}>•</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close date */}
                <div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#ffb77d",
                    fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 6,
                  }}>
                    CLOSE DATE
                  </span>
                  <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif" }}>
                    {selected.closeDate}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "deals",
  tag: "Deals Pipeline",
  heroTitle: "Your pipeline.<br /><span style=\"color:#ffb77d\">Always full.</span>",
  heroSubtitle: "A full CRM-style sales pipeline built into your WhatsApp workflow. Track deal stages, values, close dates, and owners — without switching tools.",
  heroScreen: "",
  overviewTitle: "Stop losing deals in DMs.",
  overviewDesc: "Most WhatsApp sales teams track deals in their heads, on paper, or in a spreadsheet they never update. Wazelo CRM gives you a Kanban-style pipeline where every deal is linked to a WhatsApp conversation, a contact, and a stage — so your team sees exactly what's open, what's stalled, and what's about to close.",
  capabilities: [
    { icon: "view_kanban",    title: "Kanban deal board",       desc: "Visualise every open deal across your custom pipeline stages. Drag to move, click to open." },
    { icon: "attach_money",   title: "Deal value & close date", desc: "Set expected revenue and expected close date per deal. Your forecast updates in real time." },
    { icon: "assignment_ind", title: "Deal owner assignment",   desc: "Assign each deal to the agent or team responsible. Accountability at every stage." },
    { icon: "forum",          title: "Linked conversation",     desc: "Every deal is linked to a WhatsApp conversation thread. Full context, always one click away." },
    { icon: "history",        title: "Deal activity log",       desc: "Automatic log of every stage change, note, and file attached to the deal." },
    { icon: "trending_up",    title: "Pipeline analytics",      desc: "Win rate, average deal size, time in stage, and conversion rate — tracked automatically." },
  ],
  howItWorks: [
    { step: "01", title: "Create a deal from any conversation", desc: "Open any WhatsApp conversation and create a deal in two clicks. Contact details, tags, and history carry over automatically." },
    { step: "02", title: "Set your pipeline stages",            desc: "Define your own stages — e.g. New Lead, Qualified, Proposal Sent, Negotiation, Won. Drag deals between stages as they progress." },
    { step: "03", title: "Log notes and set close dates",       desc: "Add internal notes, set deal values, and pick an expected close date. Use these to prioritise your daily follow-ups." },
    { step: "04", title: "Review your forecast",                desc: "Open the pipeline analytics view to see total open value, win rate, and which stage is becoming a bottleneck for your team." },
  ],
  screens: [],
  relatedFeatures: [
    { label: "Shared Inbox",  href: "/features/shared-inbox",   icon: "forum"        },
    { label: "Contacts CRM",  href: "/features/contacts",       icon: "group"        },
    { label: "Lead Scoring",  href: "/features/lead-scoring",   icon: "query_stats"  },
    { label: "Sequences",     href: "/features/sequences",      icon: "low_priority" },
  ],
  interactiveSection: <KanbanMockup />,
};

export default function DealsClient() {
  return <FeatureDetailPage data={data} />;
}
