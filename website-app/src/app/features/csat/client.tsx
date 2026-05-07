"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const agents = [
  { name: "Priya S.", surveys: 48, score: 4.8 },
  { name: "Rahul K.", surveys: 39, score: 4.5 },
  { name: "Meera J.", surveys: 31, score: 4.1 },
];

function getAgentScoreStyle(score: number): React.CSSProperties {
  if (score >= 4.5) {
    return { fontSize: 12, fontWeight: 700, color: "#34d399" };
  } else if (score >= 4.0) {
    return { fontSize: 12, fontWeight: 700, color: "#fbbf24" };
  } else {
    return { fontSize: 12, fontWeight: 700, color: "#ef4444" };
  }
}

function CsatMockup() {
  const [selectedStar, setSelectedStar] = useState<number>(0);
  const [commentVisible, setCommentVisible] = useState<boolean>(false);

  useEffect(() => {
    let star = 0;
    const id = setInterval(() => {
      star = star >= 5 ? 0 : star + 1;
      setSelectedStar(star);
      setCommentVisible(star > 0);
    }, 1500);
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
        CSAT surveys, automatically.
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
            wazelo.in — CSAT Surveys
          </span>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 380 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: "24px 20px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}>
              Post-Resolution Survey
            </div>

            {/* Agent bubble */}
            <div style={{
              background: "#2a2a2a",
              borderRadius: "12px 12px 12px 4px",
              padding: "12px 14px",
              maxWidth: "85%",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.6 }}>
                Hi! We&apos;ve resolved your issue. How was your experience today?
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "right", marginTop: 6 }}>
                Wazelo CRM &nbsp;✓✓
              </div>
            </div>

            {/* Star rating row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedStar(i);
                    setCommentVisible(true);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 22,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    lineHeight: 1,
                    color: i <= selectedStar ? "#fbbf24" : "rgba(219,194,176,0.3)",
                    transition: "color 0.15s",
                  }}
                >
                  {i <= selectedStar ? "★" : "☆"}
                </button>
              ))}
            </div>

            {/* Comment input */}
            {commentVisible && (
              <div style={{ opacity: 1, transition: "opacity 0.3s" }}>
                <input
                  placeholder="Add a comment (optional)..."
                  style={{
                    background: "#2a2a2a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#e5e2e1",
                    width: "100%",
                    outline: "none",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  style={{
                    background: "#ffb77d",
                    color: "#4d2600",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Submit Rating ({selectedStar}★)
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 260, flexShrink: 0, padding: "24px 18px", background: "#131313" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
              CSAT Dashboard
            </div>

            {/* Big score */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 48, fontWeight: 700, color: "#fbbf24" }}>4.2</span>
                <span style={{ fontSize: 20, color: "rgba(255,255,255,0.35)" }}>/5</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>avg score</div>
              <div style={{ fontSize: 11, color: "#fbbf24", letterSpacing: 2 }}>★★★★☆</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>68% response rate</div>
            </div>

            {/* Agent table */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: "4px 12px",
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>Agent</span>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textAlign: "center" }}>Surveys</span>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textAlign: "right" }}>Score</span>
              </div>

              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "4px 12px",
                    padding: "8px 0",
                    borderBottom: i < agents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#fff" }}>{agent.name}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>{agent.surveys}</span>
                  <span style={{ ...getAgentScoreStyle(agent.score), textAlign: "right" }}>{agent.score.toFixed(1)}</span>
                </div>
              ))}
            </div>

            {/* Alert row */}
            <div style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 12, color: "#ef4444" }}>
                ⚠ 2 low-score conversations this week
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "csat",
  tag: "CSAT Surveys",
  heroTitle: "Know how customers<br /><span style=\"color:#ffb77d\">really feel.</span>",
  heroSubtitle: "Automatically send satisfaction surveys after every resolved WhatsApp conversation. Collect scores, read responses, and identify your best and worst-performing agents.",
  heroScreen: "/screens/09-csat-surveys.png",
  overviewTitle: "Every resolved conversation is a data point.",
  overviewDesc: "CSAT surveys are usually an afterthought — a form link nobody clicks. Wazelo CRM sends satisfaction surveys directly on WhatsApp, immediately after a conversation is marked resolved, with quick-tap rating buttons so customers respond in 2 seconds. Every score is automatically linked to the agent and conversation, giving you a real, unbiased view of team performance.",
  capabilities: [
    { icon: "star_rate", title: "Automatic post-resolution surveys", desc: "Survey sends the moment a conversation is marked resolved. No manual trigger required." },
    { icon: "thumbs_up_down", title: "1–5 star or thumbs rating", desc: "Choose your rating format — numeric scale or thumbs up/down. Tapping sends the response instantly." },
    { icon: "message", title: "Open-ended follow-up", desc: "After the rating, optionally ask a follow-up question to capture qualitative feedback." },
    { icon: "person_search", title: "Per-agent scoring", desc: "Every CSAT score is linked to the agent who handled the conversation. Agent leaderboards update in real time." },
    { icon: "bar_chart", title: "CSAT analytics dashboard", desc: "Average score by agent, team, date range, and conversation tag. Spot trends before they become problems." },
    { icon: "notifications", title: "Low-score alerts", desc: "Get notified immediately when a contact gives a 1 or 2-star rating so you can follow up fast." },
  ],
  howItWorks: [
    { step: "01", title: "Enable CSAT for your team", desc: "Turn on CSAT surveys in your settings and choose your rating format. One toggle — no template approvals needed." },
    { step: "02", title: "Survey sends automatically", desc: "When any agent marks a conversation resolved, the CSAT message is sent to the customer on WhatsApp within seconds." },
    { step: "03", title: "Customer taps a rating", desc: "The customer sees a rating message and taps their score. No forms, no links, no friction." },
    { step: "04", title: "Track scores in real time", desc: "Every response appears in your CSAT dashboard. Filter by agent, date, or tag to understand performance across your team." },
  ],
  screens: [],
  relatedFeatures: [
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Analytics", href: "/features/analytics", icon: "bar_chart" },
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Bulk Campaigns", href: "/features/campaigns", icon: "campaign" },
  ],
  interactiveSection: <CsatMockup />,
};

export default function CsatClient() {
  return <FeatureDetailPage data={data} />;
}
