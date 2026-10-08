"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";
import { useInView } from "@/lib/wazelo";

function AnalyticsMockup() {
  const view = useInView(0.2);
  const [bars, setBars] = useState([0, 0, 0, 0, 0, 0, 0]);
  const targetBars = [62, 88, 45, 91, 73, 58, 84];

  useEffect(() => {
    if (!view.inView) return;
    const timer = setTimeout(() => setBars(targetBars), 100);
    return () => clearTimeout(timer);
  }, [view.inView]);

  const kpis = [
    { label: "Total Messages", value: "48,500", icon: "forum", delta: "+12%" },
    { label: "Avg Response", value: "4m 12s", icon: "timer", delta: "-8%" },
    { label: "Delivered", value: "96.4%", icon: "done_all", delta: "+1.2%" },
    { label: "Conversion Rate", value: "18%", icon: "trending_up", delta: "+3%" },
  ];

  const agents = [
    { name: "Priya S.", convs: 142, time: "3m 40s", score: 31 },
    { name: "Rahul K.", convs: 118, time: "5m 12s", score: 24 },
    { name: "Meera J.", convs: 97, time: "6m 05s", score: 19 },
    { name: "Arjun T.", convs: 83, time: "7m 22s", score: 12 },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div ref={view.ref}>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <p style={{ fontSize: 11, color: "var(--c-primary-container)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          See it in action
        </p>
        <h3 style={{ fontSize: 32, fontWeight: 700, color: "var(--c-on-surface)", margin: 0 }}>
          The analytics dashboard, live.
        </h3>
      </div>

      {/* Mockup container */}
      <div style={{
        borderRadius: 16,
        background: "var(--c-surface-container-lowest)",
        boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)",
        padding: 28,
        marginTop: 32,
      }}>

        {/* Row 1 - KPI cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}>
          {kpis.map((kpi) => {
            const isPositiveDelta = kpi.delta.startsWith("+");
            const deltaColor = isPositiveDelta ? "var(--c-success)" : "var(--c-success)"; // response time down = good too
            // For "Avg Response", a "-" delta is actually good (faster)
            const deltaGood = kpi.delta.startsWith("+") || kpi.label === "Avg Response";
            const finalDeltaColor = kpi.label === "Avg Response"
              ? (kpi.delta.startsWith("-") ? "var(--c-success)" : "var(--c-error)")
              : (kpi.delta.startsWith("+") ? "var(--c-success)" : "var(--c-error)");

            return (
              <div key={kpi.label} style={{
                background: "var(--c-surface-container-high)",
                borderRadius: 12,
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--c-primary-container)" }}>
                    {kpi.icon}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--c-on-surface-variant)" }}>{kpi.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "var(--c-on-surface)" }}>{kpi.value}</span>
                  <span style={{ fontSize: 12, color: finalDeltaColor }}>{kpi.delta}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2 - Chart + Leaderboard */}
        <div style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "60% 40%",
          gap: 20,
        }}>

          {/* Left - Bar chart */}
          <div style={{ background: "var(--c-surface-container-high)", borderRadius: 12, padding: "20px 20px 16px" }}>
            <p style={{ fontSize: 13, color: "var(--c-on-surface-variant)", margin: 0 }}>
              Message Volume, This Week
            </p>
            <div style={{
              height: 160,
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              marginTop: 12,
            }}>
              {days.map((day, i) => (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                    <div style={{
                      width: "100%",
                      height: `${bars[i]}%`,
                      background: "linear-gradient(to top, var(--c-primary), var(--c-primary-container))",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.8s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--c-placeholder)" }}>{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Agent leaderboard */}
          <div style={{ background: "var(--c-surface-container-high)", borderRadius: 12, padding: "20px 20px 16px" }}>
            <p style={{ fontSize: 13, color: "var(--c-on-surface-variant)", margin: 0 }}>
              Team Performance
            </p>
            <div style={{ marginTop: 12 }}>
              {agents.map((agent, i) => (
                <div key={agent.name} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid rgb(var(--fx-ink) / 0.05)",
                  padding: "10px 0",
                }}>
                  {/* Rank */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgb(var(--fx-accent) / 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--c-primary-container)",
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  {/* Name */}
                  <span style={{ fontSize: 13, color: "var(--c-on-surface)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {agent.name}
                  </span>
                  {/* Convs */}
                  <span style={{ fontSize: 12, color: "var(--c-placeholder)", minWidth: 30, textAlign: "right" }}>
                    {agent.convs}
                  </span>
                  {/* Avg time */}
                  <span style={{ fontSize: 11, color: "var(--c-placeholder)", minWidth: 44, textAlign: "right" }}>
                    {agent.time}
                  </span>
                  {/* Score */}
                  <span style={{ fontSize: 12, color: "var(--c-primary-container)", minWidth: 32, textAlign: "right" }}>
                    {agent.score} won
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "analytics",
  tag: "Analytics",
  heroTitle: "Data that<br /><span style=\"color:var(--c-primary-container)\">drives deals.</span>",
  heroSubtitle: "Messages, response times, delivery and conversions for today, this week or this month, with every agent's numbers for managers.",
  overviewTitle: "Know how your WhatsApp is doing.",
  overviewDesc: "The dashboard is the first thing you see after logging in. Everyone gets total messages, average response time and delivery, plus message volume and response time charts. Admins and Managers also see the lead funnel, peak hours, a row for each agent, and a summary of campaign delivery, reads and failures.",
  capabilities: [
    { icon: "speed", title: "KPI cards", desc: "Total Messages, Avg Response Time, Delivered and Conversion Rate at a glance." },
    { icon: "bar_chart", title: "Volume and response time", desc: "Charts for the period you pick: Today, This Week or This Month." },
    { icon: "filter_alt", title: "Conversion funnel", desc: "How many contacts are at New, Contacted, Interested, Converted and Closed." },
    { icon: "schedule", title: "Peak hours", desc: "Hourly bars show when customers message most, so you can staff those hours." },
    { icon: "groups", title: "Team performance", desc: "Sent, Received, Avg Response, Converted and Active Convos for every agent." },
    { icon: "campaign", title: "Campaign summary", desc: "Campaigns sent, with their Delivered, Read and Failed totals." },
  ],
  details: [
    { title: "Everyone sees", items: ["Total Messages", "Avg Response Time", "Delivered", "Message Volume", "Response Time"] },
    { title: "Admins and Managers also see", items: ["Conversion Rate", "Conversion Funnel", "Peak Hours", "Team Performance", "Campaign summary"] },
    { title: "Freelancer dashboard", items: ["Total Leads", "Proposals Sent", "Closed This Month", "Follow-ups Due Today", "Pipeline bar"] },
  ],
  howItWorks: [
    { step: "01", title: "Log in", desc: "The dashboard opens with today's numbers." },
    { step: "02", title: "Pick a period", desc: "Switch between Today, This Week and This Month." },
    { step: "03", title: "Compare the team", desc: "Managers scroll to Team Performance to see each agent side by side." },
    { step: "04", title: "Check satisfaction", desc: "Open the CSAT page for average ratings and scores by agent." },
  ],
  faqs: [
    { q: "Can employees see everyone's numbers?", a: "No. Employees see message and response-time figures. The funnel, peak hours, team and campaign views are for Admins and Managers." },
    { q: "Can I export reports?", a: "Not from the dashboard yet." },
    { q: "Where are CSAT scores?", a: "On their own Customer Satisfaction page, with average rating, rating distribution and scores by agent." },
  ],
  relatedFeatures: [
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Bulk Campaigns", href: "/features/campaigns", icon: "campaign" },
    { label: "CSAT Surveys", href: "/features/csat", icon: "star_rate" },
    { label: "Developer API", href: "/features/developer-api", icon: "code" },
  ],
  interactiveSection: <AnalyticsMockup />,
};

export default function AnalyticsClient() {
  return <FeatureDetailPage data={data} />;
}
