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
  { id: "opened",       label: "+20 Marked as interested",  points: "+20", matchTag: "opened",       color: "var(--c-success)" },
  { id: "replied",      label: "+5 Customer replied",       points: "+5", matchTag: "replied",      color: "var(--c-success)" },
  { id: "hasPhone",     label: "+10 Tag Added",             points: "+10", matchTag: "hasPhone",     color: "var(--c-success)" },
  { id: "isLead",       label: "+5 Contact Created",         points: "+5",  matchTag: "isLead",       color: "var(--c-success)" },
  { id: "unresponsive", label: "+3 Note Added",             points: "+3",  matchTag: "unresponsive", color: "var(--c-success)" },
];

const avatarGradients = [
  "linear-gradient(135deg, var(--c-outline-variant), var(--c-primary))",
  "linear-gradient(135deg, var(--c-primary-container), #ef4444)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
  "linear-gradient(135deg, #3b82f6, var(--c-primary))",
];

function getScoreBadgeStyle(score: number): React.CSSProperties {
  if (score >= 70) {
    return {
      background: "color-mix(in srgb, var(--c-success) 12%, transparent)",
      color: "var(--c-success)",
      border: "1px solid color-mix(in srgb, var(--c-success) 30%, transparent)",
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  } else if (score >= 40) {
    return {
      background: "rgb(var(--fx-accent) / 0.12)",
      color: "var(--c-primary-container)",
      border: "1px solid rgb(var(--fx-accent) / 0.3)",
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  } else {
    return {
      background: "color-mix(in srgb, var(--c-error) 12%, transparent)",
      color: "#ef4444",
      border: "1px solid color-mix(in srgb, var(--c-error) 30%, transparent)",
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
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-primary-container)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          See it in action
        </span>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, color: "var(--c-on-surface)", margin: "0 0 0 0" }}>
        Score leads automatically.
      </h3>

      <div style={{
        background: "var(--c-surface-container-lowest)",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)",
        overflow: "hidden",
        marginTop: 32,
      }}>
        {/* App chrome bar */}
        <div style={{
          background: "var(--c-surface)",
          borderBottom: "1px solid rgb(var(--fx-ink) / 0.06)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--c-primary-container)" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--c-success)" }} />
          <span style={{ marginLeft: 12, fontSize: 12, color: "var(--c-placeholder)", fontFamily: "monospace" }}>
            wazelo.in - Lead Scoring
          </span>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 380 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: "20px 20px", borderRight: "1px solid rgb(var(--fx-ink) / 0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 16 }}>
              Leads - Sorted by Score
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
                      borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)",
                      opacity: isHighlighted ? 1 : 0.25,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--c-surface-container-high)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--c-placeholder)",
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
                      color: "var(--c-on-surface)",
                      flexShrink: 0,
                    }}>
                      {lead.name.split(" ").map(n => n[0]).join("")}
                    </div>

                    {/* Name + phone */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)" }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-placeholder)" }}>{lead.phone}</div>
                    </div>

                    {/* Score badge */}
                    <div style={getScoreBadgeStyle(lead.score)}>
                      {lead.score}
                    </div>

                    {/* Last active */}
                    <div style={{ fontSize: 11, color: "var(--c-placeholder)", textAlign: "right", minWidth: 60 }}>
                      {lead.last}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 240, flexShrink: 0, padding: "20px 18px", background: "var(--c-surface)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 16 }}>
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
                      background: isActive ? "rgb(var(--fx-accent) / 0.1)" : "var(--c-surface-container-high)",
                      border: isActive ? "1px solid rgb(var(--fx-accent) / 0.3)" : "1px solid rgb(var(--fx-ink) / 0.06)",
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
                      background: isPositive ? "color-mix(in srgb, var(--c-success) 10%, transparent)" : "color-mix(in srgb, var(--c-error) 10%, transparent)",
                      borderRadius: 6,
                      padding: "3px 6px",
                      flexShrink: 0,
                    }}>
                      {rule.points}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--c-on-surface-variant)", flex: 1 }}>
                      {rule.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "var(--c-placeholder)", fontStyle: "italic", marginTop: 16, textAlign: "center" }}>
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
  heroTitle: "Know who to call<br /><span style=\"color:var(--c-primary-container)\">first. Always.</span>",
  heroSubtitle: "Give contacts points when they reply, get tagged or change status. Badges show who is Hot, Warm or Cool.",
  overviewTitle: "Know who is warming up.",
  overviewDesc: "Lead scoring adds or removes points when something happens to a contact: they are created, send a message, get a tag or a note, or move to a new lead status. Scores stay between 0 and 100 and every change is logged. Five starter rules are ready the day you sign up, like +5 when a customer replies and +20 when they are marked Interested.",
  capabilities: [
    { icon: "tune", title: "Your own rules", desc: "Name a rule, pick a signal, and give it anywhere from -100 to +100 points." },
    { icon: "repeat", title: "Caps per contact", desc: "Set Max fires per contact so one chatty lead doesn't run away with the score." },
    { icon: "local_fire_department", title: "Hot, Warm and Cool", desc: "A badge on every contact: Hot at 75 and above, Warm at 50, Cool at 25." },
    { icon: "bolt", title: "Updates on its own", desc: "Scores change the moment the signal happens. No spreadsheet, no manual entry." },
    { icon: "history", title: "Score history", desc: "Every change is recorded, so you can see why a contact has the score they do." },
    { icon: "checklist", title: "Starter rules included", desc: "Five default rules, such as Customer replied (+5, up to 10 times) and Marked as interested (+20)." },
  ],
  details: [
    { title: "Signals", items: ["Contact Created", "Lead Status Changed", "Message Received", "Note Added", "Tag Added"] },
    { title: "Rule settings", items: ["Name", "Description", "Signal", "Points (-100 to 100)", "Max fires per contact"] },
    { title: "Badges", items: ["Cool 25+", "Warm 50+", "Hot 75+"] },
  ],
  howItWorks: [
    { step: "01", title: "Start with the defaults", desc: "Five scoring rules are set up for you when you sign up." },
    { step: "02", title: "Add your own", desc: "Create a rule, pick a signal, then set the points and a cap." },
    { step: "03", title: "Let contacts engage", desc: "Scores update as messages, tags, notes and status changes happen." },
    { step: "04", title: "Spot the hot leads", desc: "Check the Hot, Warm and Cool badges on your contacts list and profiles." },
  ],
  faqs: [
    { q: "Where do I see a contact's score?", a: "As a badge on the contacts list, the contact drawer and the contact's page." },
    { q: "Do scores drop over time?", a: "No. Scores change only when a rule fires, and always stay between 0 and 100." },
    { q: "Can a score trigger an automation?", a: "Not yet. Scores are for prioritising who your team talks to next." },
  ],
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
