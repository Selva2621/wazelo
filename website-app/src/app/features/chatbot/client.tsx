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
        <PhoneFrame contact={{ name: "Wazelo Bot", initials: "WB", subtitle: "Business account" }} typing={typing}>
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
                  Great choice! Our Starter plan fits small teams. Want me to send the price list?
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
  heroSubtitle: "Answer WhatsApp messages with an AI bot that reads your documents, or a step-by-step flow you design.",
  overviewTitle: "Answer the first message, any hour.",
  overviewDesc: "Start with Create AI Chatbot: write a system prompt, choose which products it covers, and upload PDF, TXT, CSV or Markdown files. It replies using your documents, your knowledge base articles and the last 20 messages of the chat. Or build a Custom Flow that sends messages, asks questions, checks answers and calls your API, then test it before you switch it on.",
  capabilities: [
    { icon: "smart_toy", title: "AI Chatbot", desc: "Set a System Prompt and Product Scope, upload product docs, and the bot answers from them." },
    { icon: "bolt", title: "Three triggers", desc: "Start on a Keyword Match, a First Message, or a Button Reply." },
    { icon: "quiz", title: "Ask and remember", desc: "Ask Question saves the answer as a variable you can use later in the chat, like {{name}}." },
    { icon: "call_split", title: "Conditions", desc: "Branch on an answer that equals, contains or does not equal a value." },
    { icon: "api", title: "API Call step", desc: "Fetch or send data to your own system in the middle of a conversation." },
    { icon: "science", title: "Test before going live", desc: "Run a custom flow in the Test panel, then Activate or Pause it at any time." },
  ],
  details: [
    { title: "Flow steps", items: ["Send Message", "Ask Question", "Condition", "AI Reply", "Intent Detect", "API Call", "Carousel (as a numbered list)"] },
    { title: "What the AI reads", items: ["System Prompt", "Product Scope", "PDF, TXT, CSV, Markdown", "Up to 20MB per file", "Knowledge base articles", "Last 20 messages"] },
    { title: "Triggers", items: ["Keyword Match", "First Message", "Button Reply"] },
  ],
  howItWorks: [
    { step: "01", title: "Choose a bot type", desc: "Click Create AI Chatbot (recommended) or Create Custom Flow." },
    { step: "02", title: "Teach or design it", desc: "Add a prompt and documents for the AI, or add steps for a custom flow." },
    { step: "03", title: "Set the trigger", desc: "Pick a keyword, a first message, or a button reply." },
    { step: "04", title: "Activate", desc: "Test a custom flow, then switch the bot on. Pause it whenever you like." },
  ],
  faqs: [
    { q: "Do I need to code?", a: "No. The AI bot needs only a prompt and your documents. The API Call step is optional, for teams who want to connect their own system." },
    { q: "Which files can the AI learn from?", a: "PDF, TXT, CSV and Markdown files up to 20MB each, plus the articles in your knowledge base." },
    { q: "Does the bot answer every message?", a: "It answers incoming text messages that match its trigger. When the bot replies to a message, automation rules don't also fire for it." },
    { q: "Who can build chatbots?", a: "Admins and Managers." },
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
