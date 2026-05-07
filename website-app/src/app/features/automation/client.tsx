"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── Node data ────────────────────────────────────────────────────────────────
const nodes = [
  {
    id: "trigger",
    type: "trigger",
    label: "Message Received",
    sub: "Contains 'price' or 'cost'",
    icon: "notifications_active",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
    typeLabel: "TRIGGER",
  },
  {
    id: "condition",
    type: "condition",
    label: "Is Tagged as Lead?",
    sub: "Check contact tag",
    icon: "call_split",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    typeLabel: "CONDITION",
  },
  {
    id: "yes",
    type: "action",
    label: "Send Auto-Reply",
    sub: "\"Let me share our pricing...\"",
    icon: "send",
    color: "#ffb77d",
    bg: "rgba(255,183,125,0.1)",
    border: "rgba(255,183,125,0.3)",
    typeLabel: "ACTION",
  },
  {
    id: "no",
    type: "action",
    label: "Assign to Sales Team",
    sub: "Round-robin assignment",
    icon: "person_add",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.1)",
    border: "rgba(14,165,233,0.3)",
    typeLabel: "ACTION",
  },
];

// ─── Node Card ────────────────────────────────────────────────────────────────
function NodeCard({
  node,
  hovered,
  onEnter,
  onLeave,
  width,
}: {
  node: typeof nodes[number];
  hovered: string | null;
  onEnter: () => void;
  onLeave: () => void;
  width?: number | string;
}) {
  const dimmed = hovered !== null && hovered !== node.id;
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        background: node.bg,
        border: `1px solid ${node.border}`,
        borderRadius: 12,
        padding: "14px 18px",
        cursor: "pointer",
        opacity: dimmed ? 0.35 : 1,
        transition: "opacity 0.2s",
        width: width ?? "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{
        fontSize: 10,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        color: node.color,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        marginBottom: 6,
      }}>
        {node.typeLabel}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: node.color }}>{node.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>{node.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(219,194,176,0.55)", fontFamily: "'Inter', sans-serif", marginTop: 4 }}>{node.sub}</div>
    </div>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────
function Connector({ color = "rgba(255,255,255,0.1)", height = 28 }: { color?: string; height?: number }) {
  return (
    <div style={{ width: 2, height, background: color, margin: "0 auto" }} />
  );
}

// ─── AutomationMockup ─────────────────────────────────────────────────────────
function AutomationMockup() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeCycle = ["trigger", "condition", "yes", "no", null] as const;
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % nodeCycle.length;
      setHoveredNode(nodeCycle[i] as string | null);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const trigger = nodes[0];
  const condition = nodes[1];
  const yesNode = nodes[2];
  const noNode = nodes[3];

  return (
    <div>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#f59e0b",
          fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 10,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(22px,2.8vw,36px)", fontWeight: 800,
          letterSpacing: "-0.04em", color: "#e5e2e1",
          fontFamily: "'Inter', sans-serif", marginBottom: 0,
        }}>
          Visual automations, zero code.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{
        background: "#1c1b1b",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        padding: "28px 40px",
        marginTop: 32,
      }}>

        {/* Header row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
            Automation: Price Inquiry Flow
          </span>
          <span style={{
            background: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
          }}>
            ● Active
          </span>
        </div>

        {/* Flow diagram */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Trigger node */}
          <div style={{ width: "100%", maxWidth: 440 }}>
            <NodeCard
              node={trigger}
              hovered={hoveredNode}
              onEnter={() => setHoveredNode("trigger")}
              onLeave={() => setHoveredNode(null)}
            />
          </div>

          <Connector height={28} />

          {/* Condition node */}
          <div style={{ width: "100%", maxWidth: 440 }}>
            <NodeCard
              node={condition}
              hovered={hoveredNode}
              onEnter={() => setHoveredNode("condition")}
              onLeave={() => setHoveredNode(null)}
            />
          </div>

          {/* Branch arms */}
          <div style={{ display: "flex", gap: 0, width: "100%", maxWidth: 440, marginTop: 0 }}>

            {/* YES arm */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              paddingRight: 20,
              borderRight: "1px dashed rgba(255,255,255,0.08)",
            }}>
              <div style={{ height: 20, width: 2, background: "rgba(34,197,94,0.3)", margin: "0 0 0 auto" }} />
              <span style={{
                background: "rgba(34,197,94,0.1)",
                color: "#22c55e",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                marginBottom: 8,
                marginRight: 0,
                alignSelf: "flex-end",
              }}>
                YES
              </span>
              <div style={{ height: 12, width: 2, background: "rgba(34,197,94,0.3)", marginLeft: "auto" }} />
              <div style={{ width: "100%" }}>
                <NodeCard
                  node={yesNode}
                  hovered={hoveredNode}
                  onEnter={() => setHoveredNode("yes")}
                  onLeave={() => setHoveredNode(null)}
                />
              </div>
            </div>

            {/* NO arm */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              paddingLeft: 20,
            }}>
              <div style={{ height: 20, width: 2, background: "rgba(14,165,233,0.3)", margin: "0 auto 0 0" }} />
              <span style={{
                background: "rgba(14,165,233,0.1)",
                color: "#0ea5e9",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                marginBottom: 8,
                alignSelf: "flex-start",
              }}>
                NO
              </span>
              <div style={{ height: 12, width: 2, background: "rgba(14,165,233,0.3)", marginRight: "auto" }} />
              <div style={{ width: "100%" }}>
                <NodeCard
                  node={noNode}
                  hovered={hoveredNode}
                  onEnter={() => setHoveredNode("no")}
                  onLeave={() => setHoveredNode(null)}
                />
              </div>
            </div>
          </div>

          {/* Hint */}
          <p style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12,
            color: "rgba(219,194,176,0.3)",
            fontStyle: "italic",
            fontFamily: "'Inter', sans-serif",
          }}>
            Hover any node to focus it
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "automation",
  tag: "Automation",
  heroTitle: "Build flows.<br /><span style=\"color:#ffb77d\">Not busywork.</span>",
  heroSubtitle: "Visual workflow builder for WhatsApp automation — follow-up sequences, lead qualification, smart routing, and more. No code, no limits.",
  heroScreen: "/screens/03-automation-workflow.png",
  overviewTitle: "Your best agent works 24/7 and never sleeps.",
  overviewDesc: "Manual follow-ups, repetitive answers, and missed triggers cost your team hours every day. Wazelo CRM's automation engine lets you build visual workflows that run on autopilot — from a new lead's first message to a resolved ticket's CSAT survey — so your team focuses only on conversations that need a human touch.",
  capabilities: [
    { icon: "bolt", title: "Trigger-based workflows", desc: "Start automations on any event: new message received, contact tag added, campaign replied, time elapsed, and more." },
    { icon: "account_tree", title: "Visual flow builder", desc: "Drag-and-drop conditions, delays, actions, and branches. Build complex flows without a single line of code." },
    { icon: "reply", title: "Auto-replies", desc: "Respond instantly to common queries — outside hours, on weekends, or while your team is busy." },
    { icon: "label", title: "Auto-tagging & routing", desc: "Classify and route conversations automatically based on message content, contact fields, or intent." },
    { icon: "timer", title: "Delay steps", desc: "Add time delays between steps — send a follow-up 2 hours after no reply, or a reminder 24 hours before an appointment." },
    { icon: "hub", title: "Webhook integrations", desc: "Connect to any external system. Trigger a webhook on any workflow step to sync with your CRM, ERP, or custom API." },
  ],
  howItWorks: [
    { step: "01", title: "Choose a trigger", desc: "Select what starts the workflow — an inbound message, a tag, a form submission, a time condition, or a campaign interaction." },
    { step: "02", title: "Build your flow", desc: "Add conditions, actions, delays, and branches using the visual builder. Preview the flow before activating." },
    { step: "03", title: "Test it", desc: "Run the workflow on a test contact to verify every step fires correctly before going live." },
    { step: "04", title: "Activate and monitor", desc: "Switch it on. Monitor run counts, errors, and conversion metrics from the automation dashboard." },
  ],
  screens: [],
  relatedFeatures: [
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Chatbot Builder", href: "/features/chatbot", icon: "smart_toy" },
    { label: "Sequences", href: "/features/sequences", icon: "low_priority" },
    { label: "Lead Scoring", href: "/features/lead-scoring", icon: "query_stats" },
  ],
  interactiveSection: <AutomationMockup />,
};

export default function AutomationClient() {
  return <FeatureDetailPage data={data} />;
}
