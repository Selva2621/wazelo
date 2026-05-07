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
    { label: "CSAT Score", value: "4.3/5", icon: "star", delta: "+0.3" },
    { label: "Resolution Rate", value: "87%", icon: "check_circle", delta: "+5%" },
  ];

  const agents = [
    { name: "Priya S.", convs: 142, time: "3m 40s", score: 4.8 },
    { name: "Rahul K.", convs: 118, time: "5m 12s", score: 4.5 },
    { name: "Meera J.", convs: 97, time: "6m 05s", score: 4.1 },
    { name: "Arjun T.", convs: 83, time: "7m 22s", score: 3.9 },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div ref={view.ref}>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <p style={{ fontSize: 11, color: "#ffb77d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          See it in action
        </p>
        <h3 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: 0 }}>
          The analytics dashboard, live.
        </h3>
      </div>

      {/* Mockup container */}
      <div style={{
        borderRadius: 16,
        background: "#1c1b1b",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        padding: 28,
        marginTop: 32,
      }}>

        {/* Row 1 — KPI cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}>
          {kpis.map((kpi) => {
            const isPositiveDelta = kpi.delta.startsWith("+");
            const deltaColor = isPositiveDelta ? "#34d399" : "#34d399"; // response time down = good too
            // For "Avg Response", a "-" delta is actually good (faster)
            const deltaGood = kpi.delta.startsWith("+") || kpi.label === "Avg Response";
            const finalDeltaColor = kpi.label === "Avg Response"
              ? (kpi.delta.startsWith("-") ? "#34d399" : "#f87171")
              : (kpi.delta.startsWith("+") ? "#34d399" : "#f87171");

            return (
              <div key={kpi.label} style={{
                background: "#2a2a2a",
                borderRadius: 12,
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ffb77d" }}>
                    {kpi.icon}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(219,194,176,0.55)" }}>{kpi.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{kpi.value}</span>
                  <span style={{ fontSize: 12, color: finalDeltaColor }}>{kpi.delta}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2 — Chart + Leaderboard */}
        <div style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "60% 40%",
          gap: 20,
        }}>

          {/* Left — Bar chart */}
          <div style={{ background: "#2a2a2a", borderRadius: 12, padding: "20px 20px 16px" }}>
            <p style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", margin: 0 }}>
              Message Volume — Last 7 Days
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
                      background: "linear-gradient(to top, #d97707, #ffb77d)",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.8s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(219,194,176,0.4)" }}>{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Agent leaderboard */}
          <div style={{ background: "#2a2a2a", borderRadius: 12, padding: "20px 20px 16px" }}>
            <p style={{ fontSize: 13, color: "rgba(219,194,176,0.55)", margin: 0 }}>
              Top Agents
            </p>
            <div style={{ marginTop: 12 }}>
              {agents.map((agent, i) => (
                <div key={agent.name} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  padding: "10px 0",
                }}>
                  {/* Rank */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(255,183,125,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ffb77d",
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  {/* Name */}
                  <span style={{ fontSize: 13, color: "#e5e2e1", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {agent.name}
                  </span>
                  {/* Convs */}
                  <span style={{ fontSize: 12, color: "rgba(219,194,176,0.45)", minWidth: 30, textAlign: "right" }}>
                    {agent.convs}
                  </span>
                  {/* Avg time */}
                  <span style={{ fontSize: 11, color: "rgba(219,194,176,0.35)", minWidth: 44, textAlign: "right" }}>
                    {agent.time}
                  </span>
                  {/* Score */}
                  <span style={{ fontSize: 12, color: "#ffb77d", minWidth: 32, textAlign: "right" }}>
                    {agent.score} ★
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
  heroTitle: "Data that<br /><span style=\"color:#ffb77d\">drives deals.</span>",
  heroSubtitle: "Track response times, delivery rates, agent performance, and CSAT scores — all in one real-time dashboard.",
  heroScreen: "/screens/04-analytics-dashboard.png",
  overviewTitle: "You can't improve what you can't measure.",
  overviewDesc: "Gut feel doesn't scale. Wazelo CRM gives you a live analytics layer across your entire WhatsApp operation — from message delivery rates and campaign performance to individual agent response times and customer satisfaction scores. Export raw data or integrate via API into your BI tool of choice.",
  capabilities: [
    { icon: "bar_chart", title: "Message delivery analytics", desc: "Track sent, delivered, read, and failed counts per campaign, channel, or time period." },
    { icon: "speed", title: "Response time tracking", desc: "Measure first response time and average resolution time per agent, team, or conversation type." },
    { icon: "person_search", title: "Agent performance", desc: "Leaderboards for conversations handled, resolution rate, and CSAT score per agent." },
    { icon: "star_rate", title: "CSAT scores", desc: "Automatic customer satisfaction surveys with aggregated scoring by agent, team, and time period." },
    { icon: "trending_up", title: "Campaign performance", desc: "Open rates, reply rates, and conversion tracking for every broadcast campaign." },
    { icon: "download", title: "Export & API", desc: "Download CSV exports or access raw analytics via REST API for use in your own BI dashboards." },
  ],
  howItWorks: [
    { step: "01", title: "Data is collected automatically", desc: "Every message sent, delivered, read, or replied — every agent action and CSAT response — is captured in real time." },
    { step: "02", title: "View your live dashboard", desc: "Open the Analytics tab for a real-time overview: today vs yesterday, week-over-week trends, and team leaderboards." },
    { step: "03", title: "Drill down into specifics", desc: "Filter by agent, date range, campaign, or conversation tag to isolate exactly what you need to see." },
    { step: "04", title: "Export or pipe to your BI tool", desc: "Download CSV reports or use the API to send data to Metabase, Looker, Power BI, or any other tool." },
  ],
  screens: [
    { src: "/screens/09-csat-surveys.png", caption: "CSAT survey responses tracked in analytics" },
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
