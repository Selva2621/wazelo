"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

// ─── Typing Dots ──────────────────────────────────────────────────────────────
const dotKeyframes = `
@keyframes chatbotDotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30%            { transform: translateY(-5px); opacity: 1; }
}
`;

function TypingIndicator() {
  return (
    <>
      <style>{dotKeyframes}</style>
      <div style={{
        background: "#2a2a2a",
        borderRadius: "10px 10px 10px 3px",
        padding: "10px 14px",
        display: "inline-flex",
        gap: 4,
        alignSelf: "flex-start",
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            background: "#94a3b8",
            width: 6,
            height: 6,
            borderRadius: "50%",
            display: "inline-block",
            animation: "chatbotDotBounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─── Bot Bubble ───────────────────────────────────────────────────────────────
function BotBubble({ text }: { text: string }) {
  return (
    <div style={{
      background: "#2a2a2a",
      color: "#e5e2e1",
      borderRadius: "10px 10px 10px 3px",
      padding: "9px 12px",
      maxWidth: "80%",
      fontSize: 13,
      lineHeight: 1.5,
      alignSelf: "flex-start",
    }}>
      {text}
    </div>
  );
}

// ─── User Bubble ──────────────────────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <div style={{
      background: "#d97707",
      color: "#4d2600",
      borderRadius: "10px 10px 3px 10px",
      padding: "9px 12px",
      maxWidth: "80%",
      fontSize: 13,
      lineHeight: 1.5,
      alignSelf: "flex-end",
    }}>
      {text}
    </div>
  );
}

// ─── Quick Reply Button ────────────────────────────────────────────────────────
function QuickReplyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,183,125,0.1)",
        border: "1px solid rgba(255,183,125,0.3)",
        color: "#ffb77d",
        borderRadius: 16,
        padding: "6px 12px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </button>
  );
}

// ─── ChatbotMockup ────────────────────────────────────────────────────────────
function ChatbotMockup() {
  // step: 0 = first bot msg + buttons
  //       1 = user tapped "💰 Pricing", show bubble + typing
  //       2 = second bot msg + buttons
  //       3 = user tapped "👤 Small Team", show bubble + typing
  //       4 = final bot msg, then reset
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [typing, setTyping] = useState(false);

  // Auto-advance all steps
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1200);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      setTyping(true);
      const t = setTimeout(() => { setTyping(false); setStep(2); }, 900);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(3), 1200);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      setTyping(true);
      const t = setTimeout(() => { setTyping(false); setStep(4); }, 900);
      return () => clearTimeout(t);
    }
    if (step === 4) {
      const t = setTimeout(() => setStep(0), 1500);
      return () => clearTimeout(t);
    }
  }, [step]);

  function handleFirstReply() {
    setStep(1);
  }

  function handleSecondReply() {
    setStep(3);
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#ffb77d",
          fontFamily: "'Inter', sans-serif", display: "block", marginBottom: 10,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(22px,2.8vw,36px)", fontWeight: 800,
          letterSpacing: "-0.04em", color: "#e5e2e1",
          fontFamily: "'Inter', sans-serif", marginBottom: 0,
        }}>
          Your 24/7 WhatsApp chatbot.
        </h2>
      </div>

      {/* Phone frame outer */}
      <div style={{ display: "flex", justifyContent: "center", padding: "0 20px" }}>
        <div style={{
          width: 300,
          height: 540,
          background: "#131313",
          borderRadius: 36,
          overflow: "hidden",
          border: "8px solid #1c1b1b",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
          marginTop: 32,
          display: "flex",
          flexDirection: "column",
        }}>

          {/* WhatsApp header bar */}
          <div style={{
            background: "#131313",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, color: "#fff", lineHeight: 1 }}>‹</span>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#ffb77d",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#fff" }}>smart_toy</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", lineHeight: 1.2 }}>Wazelo Bot</div>
              <div style={{ fontSize: 10, color: "#ffb77d", fontFamily: "'Inter', sans-serif" }}>Online</div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 10px",
            background: "#0e0e0e",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: 0,
          }}>
            {/* Step 0: First bot message — always visible */}
            <BotBubble text="Hi! 👋 What are you looking for today?" />

            {/* Quick replies for step 0 */}
            {step === 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {["💰 Pricing", "🎯 Demo", "🆘 Support"].map((r) => (
                  <QuickReplyBtn key={r} label={r} onClick={handleFirstReply} />
                ))}
              </div>
            )}

            {/* Step >= 1: user bubble */}
            {step >= 1 && <UserBubble text="💰 Pricing" />}

            {/* Step 1 typing indicator */}
            {step === 1 && typing && <TypingIndicator />}

            {/* Step >= 2: second bot message */}
            {step >= 2 && (
              <BotBubble text="Sure! We have 3 plans. Which best describes your team?" />
            )}

            {/* Quick replies for step 2 */}
            {step === 2 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {["👤 Solo", "👥 Small Team", "🏢 Enterprise"].map((r) => (
                  <QuickReplyBtn key={r} label={r} onClick={handleSecondReply} />
                ))}
              </div>
            )}

            {/* Step >= 3: second user bubble */}
            {step >= 3 && <UserBubble text="👤 Small Team" />}

            {/* Step 3 typing indicator */}
            {step === 3 && typing && <TypingIndicator />}

            {/* Step >= 4: final bot message */}
            {step >= 4 && (
              <BotBubble text="Great choice! I'll connect you with our sales team. 🚀" />
            )}

            {/* Step 4: start over button */}
            {step === 4 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <QuickReplyBtn label="Start Over" onClick={() => setStep(0)} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            background: "#1c1b1b",
            padding: "8px 12px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}>
            <div style={{
              flex: 1,
              background: "#2a2a2a",
              border: "none",
              borderRadius: 20,
              padding: "8px 12px",
              fontSize: 12,
              color: "#9ca3af",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1,
            }}>
              Type a message...
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ffb77d" }}>send</span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "chatbot",
  tag: "Chatbot Builder",
  heroTitle: "Build bots.<br /><span style=\"color:#ffb77d\">No code needed.</span>",
  heroSubtitle: "Create WhatsApp chatbots that qualify leads, answer FAQs, capture data, and hand off to your team — all without writing a single line of code.",
  heroScreen: "/screens/06-chatbot-builder.png",
  overviewTitle: "Automate the first conversation.",
  overviewDesc: "The first message a customer sends tells you everything about their intent. Wazelo CRM's chatbot builder lets you design response flows that ask the right questions, capture key information, and route to the right agent — or resolve entirely on their own — 24 hours a day, 7 days a week.",
  capabilities: [
    { icon: "smart_toy", title: "No-code flow builder", desc: "Build chatbot flows visually using a drag-and-drop canvas. No developer required." },
    { icon: "quiz", title: "Question & answer flows", desc: "Ask a sequence of questions, capture responses, and store answers as contact fields automatically." },
    { icon: "call_split", title: "Conditional branching", desc: "Route the conversation based on what the user says — keyword match, button selection, or numeric input." },
    { icon: "transfer_within_a_station", title: "Agent handoff", desc: "At any point, hand the conversation to a human agent — with the full chatbot transcript already in the inbox." },
    { icon: "quick_replies", title: "Quick reply buttons", desc: "Add tap-to-reply buttons so users don't have to type. Faster for them, cleaner data for you." },
    { icon: "schedule_send", title: "24/7 availability", desc: "Your chatbot handles incoming messages even when your whole team is offline. Nothing slips through after hours." },
  ],
  howItWorks: [
    { step: "01", title: "Design your flow", desc: "Use the visual builder to map out how your bot should respond to different inputs — start with a template or build from scratch." },
    { step: "02", title: "Add questions and branches", desc: "Insert question blocks, decision branches, and action steps like setting contact fields or adding tags." },
    { step: "03", title: "Set your triggers", desc: "Choose when the bot activates — on every first message, a specific keyword, outside business hours, or from a campaign CTA." },
    { step: "04", title: "Activate and review", desc: "Go live. Monitor bot sessions, drop-off points, and handoff rates to improve your flow over time." },
  ],
  screens: [
    { src: "/screens/03-automation-workflow.png", caption: "Chatbot flows integrate with automation workflows" },
  ],
  relatedFeatures: [
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Multi-Channel", href: "/features/multi-channel", icon: "devices" },
    { label: "Lead Scoring", href: "/features/lead-scoring", icon: "query_stats" },
  ],
  interactiveSection: <ChatbotMockup />,
};

export default function ChatbotClient() {
  return <FeatureDetailPage data={data} />;
}
