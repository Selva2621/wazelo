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
    color: "var(--c-success)",
    bg: "color-mix(in srgb, var(--c-success) 10%, transparent)",
    border: "color-mix(in srgb, var(--c-success) 30%, transparent)",
    typeLabel: "TRIGGER",
  },
  {
    id: "condition",
    type: "condition",
    label: "Only if Lead Status is New",
    sub: "All conditions must match",
    icon: "call_split",
    color: "var(--c-primary-container)",
    bg: "rgb(var(--fx-accent) / 0.1)",
    border: "rgb(var(--fx-accent) / 0.3)",
    typeLabel: "CONDITION",
  },
  {
    id: "yes",
    type: "action",
    label: "Send WhatsApp Message",
    sub: "\"Hi {{contact.name}}, here is our price list...\"",
    icon: "send",
    color: "var(--c-primary-container)",
    bg: "rgb(var(--fx-accent) / 0.1)",
    border: "rgb(var(--fx-accent) / 0.3)",
    typeLabel: "ACTION",
  },
  {
    id: "no",
    type: "action",
    label: "Rule skipped",
    sub: "Recorded in Execution Logs",
    icon: "block",
    color: "var(--c-code-cyan)",
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
        fontFamily: "var(--font-geist-sans), sans-serif",
        fontWeight: 700,
        marginBottom: 6,
      }}>
        {node.typeLabel}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: node.color }}>{node.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif" }}>{node.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--c-on-surface-variant)", fontFamily: "var(--font-geist-sans), sans-serif", marginTop: 4 }}>{node.sub}</div>
    </div>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────
function Connector({ color = "rgb(var(--fx-ink) / 0.1)", height = 28 }: { color?: string; height?: number }) {
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
          textTransform: "uppercase", color: "var(--c-primary-container)",
          fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 10,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(22px,2.8vw,36px)", fontWeight: 800,
          letterSpacing: "-0.04em", color: "var(--c-on-surface)",
          fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 0,
        }}>
          Trigger, condition, reply.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{
        background: "var(--c-surface-container-lowest)",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)",
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
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif" }}>
            Automation: Price Inquiry Flow
          </span>
          <span style={{
            background: "color-mix(in srgb, var(--c-success) 10%, transparent)",
            color: "var(--c-success)",
            border: "1px solid color-mix(in srgb, var(--c-success) 30%, transparent)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontFamily: "var(--font-geist-sans), sans-serif",
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
              borderRight: "1px dashed rgb(var(--fx-ink) / 0.08)",
            }}>
              <div style={{ height: 20, width: 2, background: "color-mix(in srgb, var(--c-success) 30%, transparent)", margin: "0 0 0 auto" }} />
              <span style={{
                background: "color-mix(in srgb, var(--c-success) 10%, transparent)",
                color: "var(--c-success)",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 11,
                fontFamily: "var(--font-geist-sans), sans-serif",
                fontWeight: 700,
                marginBottom: 8,
                marginRight: 0,
                alignSelf: "flex-end",
              }}>
                MATCH
              </span>
              <div style={{ height: 12, width: 2, background: "color-mix(in srgb, var(--c-success) 30%, transparent)", marginLeft: "auto" }} />
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
                color: "var(--c-code-cyan)",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 11,
                fontFamily: "var(--font-geist-sans), sans-serif",
                fontWeight: 700,
                marginBottom: 8,
                alignSelf: "flex-start",
              }}>
                NO MATCH
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
            color: "var(--c-placeholder)",
            fontStyle: "italic",
            fontFamily: "var(--font-geist-sans), sans-serif",
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
  heroTitle: "Build flows.<br /><span style=\"color:var(--c-primary-container)\">Not busywork.</span>",
  heroSubtitle: "Reply instantly when a message arrives, a contact is created, or a Shopify order or abandoned cart comes in.",
  overviewTitle: "Instant replies, set up once.",
  overviewDesc: "An automation rule watches for an event and sends a WhatsApp message straight away. Pick a trigger, add conditions such as a keyword or lead status, and write the reply with variables like the contact's name or a Shopify order number. Describe a rule in plain words and Wazelo can draft it for you. Every run is recorded in Execution Logs.",
  capabilities: [
    { icon: "bolt", title: "Event triggers", desc: "Message Received (with an optional keyword), Contact Created, Lead Status Changed and Widget Message Received." },
    { icon: "shopping_cart", title: "Shopify triggers", desc: "Order Created, Order Fulfilled and Cart Abandoned, with an optional minimum order or cart value." },
    { icon: "filter_alt", title: "Conditions", desc: "Run only when fields like Lead Status, Contact Tags or Message Body match. Every condition must be true." },
    { icon: "data_object", title: "Variables in replies", desc: "Insert {{contact.name}}, or Shopify values like the order name, total and cart recovery link." },
    { icon: "auto_awesome", title: "Generate with AI", desc: "Describe the rule in plain words and AI drafts it for you to review. Uses AI credits." },
    { icon: "receipt_long", title: "Execution Logs", desc: "Every run with its trigger, status, duration, retries and the result of each action." },
  ],
  details: [
    { title: "Triggers", items: ["Message Received", "Contact Created", "Lead Status Changed", "Shopify Order Created", "Shopify Order Fulfilled", "Shopify Cart Abandoned", "Widget Message Received"] },
    { title: "Condition fields", items: ["Contact Name", "Contact Phone", "Lead Status", "Contact Tags", "Message Body", "Conversation Status", "Trigger Keyword"] },
    { title: "Safeguards", items: ["Priority", "Max runs per contact", "Cooldown", "Loop protection", "Up to 100 rules"] },
  ],
  howItWorks: [
    { step: "01", title: "Pick a trigger", desc: "Create a rule, or describe what you want and use Generate with AI." },
    { step: "02", title: "Add conditions", desc: "Narrow it down by keyword, lead status, tags or message text." },
    { step: "03", title: "Write the reply", desc: "Compose the WhatsApp message, with variables for the contact or the Shopify order." },
    { step: "04", title: "Turn it on", desc: "Enable the rule and check Execution Logs to see each run." },
  ],
  faqs: [
    { q: "Is there a drag-and-drop builder?", a: "No. Rules are set up in a short form: one trigger, optional conditions, then the reply. Most take about a minute." },
    { q: "Can it recover abandoned Shopify carts?", a: "Yes. Connect your store and use the Cart Abandoned trigger to send {{shopify.recovery_url}}, with a minimum cart value if you like. Shopify is included from the Starter plan." },
    { q: "Does Generate with AI cost credits?", a: "Yes, it uses AI credits: 50 a month on Starter, 200 on Growth and 500 on Pro." },
    { q: "How many rules can I create?", a: "Up to 100 per workspace." },
  ],
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
