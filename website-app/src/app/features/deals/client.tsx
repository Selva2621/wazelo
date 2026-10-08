"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── KanbanMockup ─────────────────────────────────────────────────────────────
const columns = [
  { name: "Qualified", color: "var(--c-placeholder)", total: "₹73,500", deals: [
    { id: 0, name: "Ananya Sharma", value: "₹45,000", owner: "PS", days: "Day 2" },
    { id: 1, name: "Rohan Verma",   value: "₹28,500", owner: "RK", days: "Day 5" },
  ]},
  { name: "Proposal", color: "var(--c-primary)", total: "₹1,95,000", deals: [
    { id: 2, name: "Vikram Patel",  value: "₹1,20,000", owner: "MJ", days: "Day 8" },
    { id: 3, name: "Meera Joshi",   value: "₹75,000",   owner: "PS", days: "Day 3" },
  ]},
  { name: "Negotiation", color: "var(--c-primary-container)", total: "₹2,50,000", deals: [
    { id: 4, name: "Karan Mehta",   value: "₹2,50,000", owner: "AT", days: "Day 12" },
  ]},
  { name: "Won", color: "var(--c-success)", total: "₹2,40,000", deals: [
    { id: 5, name: "Sneha Rao",     value: "₹90,000",   owner: "RK", days: "Day 18" },
    { id: 6, name: "Divya Nair",    value: "₹1,50,000", owner: "MJ", days: "Day 7"  },
  ]},
];

const dealDetails = [
  { conv: "Product: Growth plan, yearly",   activity: ["Asked about team pricing on WhatsApp", "Wants a demo for 3 agents"],       closeDate: "Dec 15, 2025" },
  { conv: "Product: Starter plan",          activity: ["Created from an inbox chat", "Comparing with spreadsheet setup"],                         closeDate: "Jan 8, 2026"  },
  { conv: "Product: Pro plan",              activity: ["Needs a GST invoice", "Decision by end of month"],                   closeDate: "Dec 28, 2025" },
  { conv: "Product: Growth plan",           activity: ["Decision maker confirmed", "Sent price list on WhatsApp"],                         closeDate: "Jan 15, 2026" },
  { conv: "Product: Enterprise plan",       activity: ["Reviewing proposal", "Follow up on Monday"],              closeDate: "Dec 20, 2025" },
  { conv: "Product: Starter plan",          activity: ["Marked Won", "Onboarding next week"],              closeDate: "Nov 30, 2025" },
  { conv: "Product: Pro plan renewal",      activity: ["Existing customer upsell", "Marked Won"],                          closeDate: "Dec 7, 2025"  },
];

// Gradient pool for owner avatars
const gradients = [
  "linear-gradient(135deg,var(--c-outline-variant),var(--c-primary))",
  "linear-gradient(135deg,var(--c-primary-container),var(--c-primary-container))",
  "linear-gradient(135deg,var(--c-success),var(--c-code-green))",
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
          textTransform: "uppercase", color: "var(--c-primary-container)",
          fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 12,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, letterSpacing: "-0.04em",
          color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 0,
        }}>
          Your pipeline, always in view.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{
        background: "var(--c-surface-container-lowest)",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)",
        overflow: "hidden",
        marginTop: 32,
        position: "relative",
      }}>
        {/* App chrome bar */}
        <div style={{
          background: "var(--c-surface)",
          borderBottom: "1px solid rgb(var(--fx-ink) / 0.06)",
          padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "var(--c-placeholder)", fontFamily: "var(--font-geist-sans), sans-serif", marginLeft: 10 }}>
            Deals Pipeline - Wazelo CRM
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif" }}>{col.name}</span>
                    <span style={{
                      marginLeft: "auto",
                      background: "rgb(var(--fx-ink) / 0.07)", borderRadius: 10,
                      padding: "1px 8px", fontSize: 11,
                      color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", fontWeight: 600,
                    }}>
                      {col.deals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-placeholder)", fontFamily: "var(--font-geist-sans), sans-serif", paddingLeft: 17 }}>
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
                          background: isSelected ? "rgb(var(--fx-accent) / 0.12)" : "var(--c-surface-container-high)",
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          border: isSelected ? "1px solid var(--c-primary-container)" : "1px solid rgb(var(--fx-ink) / 0.06)",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgb(var(--fx-ink) / 0.04)";
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--c-surface-container-high)";
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 6 }}>
                          {deal.name}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: col.color, fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 8 }}>
                          {deal.value}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {/* Owner avatar */}
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: ownerGrad[deal.owner] ?? "linear-gradient(135deg,var(--c-outline-variant),var(--c-primary))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif",
                            flexShrink: 0,
                          }}>
                            {deal.owner}
                          </div>
                          {/* Days badge */}
                          <span style={{
                            background: "rgb(var(--fx-ink) / 0.06)", borderRadius: 10,
                            padding: "2px 8px", fontSize: 10,
                            color: "var(--c-placeholder)", fontFamily: "var(--font-geist-sans), sans-serif",
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
            background: "var(--c-surface)",
            borderLeft: "1px solid rgb(var(--fx-ink) / 0.06)",
            padding: "20px 18px",
          }}>
            {selected === null ? (
              <div style={{
                fontSize: 12, color: "var(--c-placeholder)",
                fontFamily: "var(--font-geist-sans), sans-serif", textAlign: "center", paddingTop: 40,
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
                    fontSize: 16, color: "var(--c-placeholder)", lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>

                {/* Deal Details heading */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 16 }}>
                  Deal Details
                </div>

                {/* Stage badge */}
                {selectedCol && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "var(--c-primary-container)",
                      fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 4,
                    }}>
                      STAGE
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: selectedCol.color,
                      fontFamily: "var(--font-geist-sans), sans-serif",
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
                    textTransform: "uppercase", color: "var(--c-primary-container)",
                    fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 6,
                  }}>
                    PRODUCT
                  </span>
                  <div style={{ fontSize: 12, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", lineHeight: 1.5 }}>
                    {selected.conv}
                  </div>
                </div>

                {/* Activity log */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "var(--c-primary-container)",
                    fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 6,
                  }}>
                    NOTES
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.activity.map((item, i) => (
                      <div key={i} style={{ fontSize: 11, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", lineHeight: 1.5, display: "flex", gap: 6 }}>
                        <span style={{ color: "var(--c-placeholder)", flexShrink: 0 }}>•</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close date */}
                <div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "var(--c-primary-container)",
                    fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 6,
                  }}>
                    EXPECTED CLOSE
                  </span>
                  <div style={{ fontSize: 12, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif" }}>
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
  heroTitle: "Your pipeline.<br /><span style=\"color:var(--c-primary-container)\">Always full.</span>",
  heroSubtitle: "Track deals on a kanban board, each linked to a contact, with a value and an expected close date.",
  overviewTitle: "See what's about to close.",
  overviewDesc: "Create a pipeline, add deals with a contact, value, product and expected close date, and drag them through Qualified, Proposal, Negotiation, Won and Lost. Each stage shows its total value, so you always know how much is in play. Create deals from a contact's page or straight from a WhatsApp chat in the inbox.",
  capabilities: [
    { icon: "view_kanban", title: "Kanban board", desc: "Drag deals between stages and see the total value of each stage and of the whole pipeline." },
    { icon: "account_tree", title: "Multiple pipelines", desc: "Keep separate pipelines, for example one for new sales and one for renewals." },
    { icon: "currency_rupee", title: "Value and close date", desc: "Record what each deal is worth in rupees and when you expect it to close." },
    { icon: "forum", title: "Create from a chat", desc: "Click Create deal in the inbox and the contact is filled in for you." },
    { icon: "inventory_2", title: "Linked to products", desc: "Attach the product from your catalogue that the deal is about." },
    { icon: "assignment_ind", title: "Owner and status", desc: "Assign each deal to a teammate and mark it Open, Won or Lost." },
  ],
  details: [
    { title: "Default stages", items: ["Qualified", "Proposal", "Negotiation", "Won", "Lost"] },
    { title: "Deal fields", items: ["Title", "Contact", "Product", "Value (INR)", "Expected close", "Notes", "Assignee", "Status"] },
    { title: "Create deals from", items: ["An inbox chat", "A contact's page", "The contact drawer", "The deals board"] },
  ],
  howItWorks: [
    { step: "01", title: "Create a pipeline", desc: "Click New Pipeline. It starts with the five default stages." },
    { step: "02", title: "Add a deal", desc: "Pick the contact, then add a value, product and expected close date." },
    { step: "03", title: "Move it along", desc: "Drag the card to the next stage as the conversation progresses." },
    { step: "04", title: "Close it out", desc: "Mark it Won or Lost and watch the stage totals update." },
  ],
  faqs: [
    { q: "Does it show win rate or forecasts?", a: "Not yet. The board shows the number and total value of deals in each stage and status." },
    { q: "Which currency are deal values in?", a: "Indian rupees (INR)." },
    { q: "Can a deal be created from WhatsApp?", a: "Yes. Click Create deal in a conversation's header and the deal is linked to that contact." },
  ],
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
