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
    return { fontSize: 12, fontWeight: 700, color: "var(--c-success)" };
  } else if (score >= 4.0) {
    return { fontSize: 12, fontWeight: 700, color: "var(--c-primary-container)" };
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
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-primary-container)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          See it in action
        </span>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, color: "var(--c-on-surface)", margin: "0 0 0 0" }}>
        Ratings, straight from WhatsApp.
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
            wazelo.in - CSAT Surveys
          </span>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", minHeight: 380 }}>

          {/* LEFT PANEL */}
          <div style={{ flex: 1, padding: "24px 20px", borderRight: "1px solid rgb(var(--fx-ink) / 0.06)" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--c-primary-container)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}>
              Rate Your Experience
            </div>

            {/* Agent bubble */}
            <div style={{
              background: "var(--c-surface-container-high)",
              borderRadius: "12px 12px 12px 4px",
              padding: "12px 14px",
              maxWidth: "85%",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: "var(--c-on-surface)", lineHeight: 1.6 }}>
                ⭐ How was your experience with us? Please rate your satisfaction (1-5 stars). Thank you for your feedback!
              </div>
              <div style={{ fontSize: 10, color: "var(--c-placeholder)", textAlign: "right", marginTop: 6 }}>
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
                    color: i <= selectedStar ? "var(--c-primary-container)" : "var(--c-placeholder)",
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
                    background: "var(--c-surface-container-high)",
                    border: "1px solid rgb(var(--fx-ink) / 0.1)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--c-on-surface)",
                    width: "100%",
                    outline: "none",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  style={{
                    background: "var(--c-primary-container)",
                    color: "var(--c-on-primary)",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Submit Feedback ({selectedStar}★)
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 260, flexShrink: 0, padding: "24px 18px", background: "var(--c-surface)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-on-surface)", marginBottom: 20 }}>
              CSAT Dashboard
            </div>

            {/* Big score */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 48, fontWeight: 700, color: "var(--c-primary-container)" }}>4.2</span>
                <span style={{ fontSize: 20, color: "var(--c-placeholder)" }}>/5</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--c-placeholder)", marginBottom: 4 }}>Avg Rating</div>
              <div style={{ fontSize: 11, color: "var(--c-primary-container)", letterSpacing: 2 }}>★★★★☆</div>
              <div style={{ fontSize: 12, color: "var(--c-placeholder)", marginTop: 4 }}>118 responses</div>
            </div>

            {/* Agent table */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: "4px 12px",
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--c-placeholder)", letterSpacing: "0.06em" }}>Agent</span>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--c-placeholder)", letterSpacing: "0.06em", textAlign: "center" }}>Surveys</span>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--c-placeholder)", letterSpacing: "0.06em", textAlign: "right" }}>Score</span>
              </div>

              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "4px 12px",
                    padding: "8px 0",
                    borderBottom: i < agents.length - 1 ? "1px solid rgb(var(--fx-ink) / 0.04)" : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--c-on-surface)" }}>{agent.name}</span>
                  <span style={{ fontSize: 12, color: "var(--c-placeholder)", textAlign: "center" }}>{agent.surveys}</span>
                  <span style={{ ...getAgentScoreStyle(agent.score), textAlign: "right" }}>{agent.score.toFixed(1)}</span>
                </div>
              ))}
            </div>

            {/* Alert row */}
            <div style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "color-mix(in srgb, var(--c-error) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--c-error) 15%, transparent)",
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 12, color: "#ef4444" }}>
                Dissatisfied (1-2): 2 this week
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
  heroTitle: "Know how customers<br /><span style=\"color:var(--c-primary-container)\">really feel.</span>",
  heroSubtitle: "Send a rating link on WhatsApp when a chat wraps up. Customers pick 1 to 5 stars, and you see scores by agent.",
  overviewTitle: "Ask at the right moment.",
  overviewDesc: "When a conversation is done, the agent clicks Send Survey. The customer gets a WhatsApp message with a link to a short page, picks Poor to Excellent, and can add a comment. Every response is tied to the conversation and the agent who handled it, so the CSAT dashboard shows how each person on your team is doing.",
  capabilities: [
    { icon: "send", title: "Send Survey from any chat", desc: "One click in the conversation header sends the rating link to the customer on WhatsApp. You decide which chats get a survey." },
    { icon: "star_rate", title: "1 to 5 stars", desc: "Customers choose Poor, Fair, Good, Very Good or Excellent on a simple mobile page." },
    { icon: "chat", title: "Optional comment", desc: "Customers can add a few words with their rating, so you know why." },
    { icon: "groups", title: "Scores by agent", desc: "Each agent's average rating and number of reviews, side by side." },
    { icon: "bar_chart", title: "Rating distribution", desc: "How many responses landed on each star, plus Satisfied (4-5) and Dissatisfied (1-2) counts." },
    { icon: "table_rows", title: "Recent responses", desc: "Contact, agent, rating, comment, sent time, and Responded or Pending for every survey." },
  ],
  details: [
    { title: "Dashboard cards", items: ["Avg Rating", "Responses", "Satisfied (4-5)", "Dissatisfied (1-2)"] },
    { title: "Rating scale", items: ["1 Poor", "2 Fair", "3 Good", "4 Very Good", "5 Excellent"] },
    { title: "Time periods", items: ["Today", "This Week", "This Month"] },
  ],
  howItWorks: [
    { step: "01", title: "Finish the conversation", desc: "Help the customer in the shared inbox as usual." },
    { step: "02", title: "Click Send Survey", desc: "The customer gets a WhatsApp message with a link to rate their experience." },
    { step: "03", title: "The customer rates", desc: "They tap 1 to 5 stars, add an optional comment and press Submit Feedback." },
    { step: "04", title: "Review the dashboard", desc: "Admins and Managers open CSAT to see the average, per-agent scores and every response." },
  ],
  faqs: [
    { q: "Are surveys sent automatically when a chat closes?", a: "No. An agent sends each survey with the Send Survey button, so you choose which conversations get one." },
    { q: "What does the customer see?", a: "A WhatsApp message asking them to rate their experience, with a link to a short page: 1 to 5 stars, an optional comment and a Submit Feedback button. They don't need to log in." },
    { q: "Who can see CSAT results?", a: "Admins and Managers. The CSAT menu is hidden for Employees and for Solo / Freelancer accounts." },
    { q: "Can I send a survey twice?", a: "Each conversation has one survey. Sending it again resends the link and updates the sent time." },
  ],
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
