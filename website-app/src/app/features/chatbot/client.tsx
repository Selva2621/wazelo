"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";
import { Incoming, Outgoing, PhoneFrame, QuickReply, Time, TypingBubble, bubbleEnter, usePageVisible } from "@/components/mocks/phone-frame";

// ─── ChatbotMockup ────────────────────────────────────────────────────────────
// A looping bot conversation in the shared WhatsApp phone. Each step adds one
// thing to the chat; "tap" steps press the quick reply the visitor picks.
const STEPS = ["menu", "tap1", "user1", "bot2", "tap2", "user2", "bot3"] as const;
type Step = (typeof STEPS)[number];
const HOLD: Record<Step, number> = { menu: 1400, tap1: 350, user1: 1000, bot2: 1400, tap2: 350, user2: 1000, bot3: 2600 };

const FIRST = ["💰 Pricing", "🎯 Book a demo", "🆘 Support"];
const SECOND = ["👤 Solo", "👥 Small team", "🏢 Enterprise"];

function Replies({ options, pressed }: { options: string[]; pressed?: string }) {
  return (
    <motion.div {...bubbleEnter} layout className="flex w-[85%] flex-col gap-1 self-start">
      {options.map((o) => (
        <QuickReply key={o} label={o} pressed={pressed === o} />
      ))}
    </motion.div>
  );
}

function ChatbotMockup() {
  const [i, setI] = useState(0);
  const visible = usePageVisible();
  const step = STEPS[i];
  const at = (s: Step) => i >= STEPS.indexOf(s);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), HOLD[step]);
    return () => clearTimeout(t);
  }, [step, visible]);

  const typing = step === "user1" || step === "user2";
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
          Your 24/7 WhatsApp chatbot.
        </h2>
      </div>

      <div className="relative mt-10 flex justify-center">
        <div aria-hidden className="device-glow" />
        <PhoneFrame contact={{ name: "Wazelo Bot", initials: "WB", subtitle: "Business account", verified: true }} typing={typing}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key="bot1" layout className="flex flex-col">
              <Incoming>
                Hi! 👋 What are you looking for today?
                <Time>10:02</Time>
              </Incoming>
            </motion.div>

            {!at("user1") && <Replies key="menu1" options={FIRST} pressed={step === "tap1" ? FIRST[0] : undefined} />}

            {at("user1") && (
              <motion.div key="user1" {...bubbleEnter} layout className="flex flex-col">
                <Outgoing>
                  {FIRST[0]}
                  <Time read>10:02</Time>
                </Outgoing>
              </motion.div>
            )}
            {step === "user1" && (
              <motion.div key="typing1" {...bubbleEnter} layout className="flex flex-col">
                <TypingBubble />
              </motion.div>
            )}

            {at("bot2") && (
              <motion.div key="bot2" {...bubbleEnter} layout className="flex flex-col">
                <Incoming>
                  Sure! We have plans for every size. Which best describes you?
                  <Time>10:02</Time>
                </Incoming>
              </motion.div>
            )}
            {at("bot2") && !at("user2") && <Replies key="menu2" options={SECOND} pressed={step === "tap2" ? SECOND[1] : undefined} />}

            {at("user2") && (
              <motion.div key="user2" {...bubbleEnter} layout className="flex flex-col">
                <Outgoing>
                  {SECOND[1]}
                  <Time read>10:03</Time>
                </Outgoing>
              </motion.div>
            )}
            {step === "user2" && (
              <motion.div key="typing2" {...bubbleEnter} layout className="flex flex-col">
                <TypingBubble />
              </motion.div>
            )}

            {at("bot3") && (
              <motion.div key="bot3" {...bubbleEnter} layout className="flex flex-col">
                <Incoming>
                  Great choice! Connecting you with our sales team now. 🚀
                  <Time>10:03</Time>
                </Incoming>
              </motion.div>
            )}
          </AnimatePresence>
        </PhoneFrame>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "chatbot",
  tag: "Chatbot Builder",
  heroTitle: "Build bots.<br /><span style=\"color:var(--c-primary-container)\">No code needed.</span>",
  heroSubtitle: "Create WhatsApp chatbots that qualify leads, answer FAQs, capture data, and hand off to your team, all without writing a single line of code.",
  overviewTitle: "Automate the first conversation.",
  overviewDesc: "The first message a customer sends tells you everything about their intent. Wazelo CRM's chatbot builder lets you design response flows that ask the right questions, capture key information, and route to the right agent, or resolve entirely on their own, 24 hours a day, 7 days a week.",
  capabilities: [
    { icon: "smart_toy", title: "No-code flow builder", desc: "Build chatbot flows visually using a drag-and-drop canvas. No developer required." },
    { icon: "quiz", title: "Question & answer flows", desc: "Ask a sequence of questions, capture responses, and store answers as contact fields automatically." },
    { icon: "call_split", title: "Conditional branching", desc: "Route the conversation based on what the user says, keyword match, button selection, or numeric input." },
    { icon: "transfer_within_a_station", title: "Agent handoff", desc: "At any point, hand the conversation to a human agent, with the full chatbot transcript already in the inbox." },
    { icon: "quick_replies", title: "Quick reply buttons", desc: "Add tap-to-reply buttons so users don't have to type. Faster for them, cleaner data for you." },
    { icon: "schedule_send", title: "24/7 availability", desc: "Your chatbot handles incoming messages even when your whole team is offline. Nothing slips through after hours." },
  ],
  howItWorks: [
    { step: "01", title: "Design your flow", desc: "Use the visual builder to map out how your bot should respond to different inputs, start with a template or build from scratch." },
    { step: "02", title: "Add questions and branches", desc: "Insert question blocks, decision branches, and action steps like setting contact fields or adding tags." },
    { step: "03", title: "Set your triggers", desc: "Choose when the bot activates: on every first message, a specific keyword, outside business hours, or from a campaign CTA." },
    { step: "04", title: "Activate and review", desc: "Go live. Monitor bot sessions, drop-off points, and handoff rates to improve your flow over time." },
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
