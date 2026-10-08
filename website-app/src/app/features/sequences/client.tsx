"use client";
import React from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";
import { useInView } from "@/lib/wazelo";

// ─── SequenceMockup ───────────────────────────────────────────────────────────
const steps = [
  { day: "Day 0",    title: "Welcome Message", preview: "Hi, thanks for reaching out to Wazelo! Here's what you need to know to get started...", type: "message" },
  { day: "Day 2",    title: "Follow-Up",       preview: "Hey, just checking in! Have you had a chance to explore our features? We'd love to help.", type: "message" },
  { day: "Day 5",    title: "Special Offer",   preview: "Hi, we'd like to offer you an exclusive 20% discount. Use code WAZE20 at checkout.", type: "message" },
  { day: "On Reply", title: "Auto-Stop",       preview: "Contact replied, so they exit the sequence automatically.", type: "stop" },
];

function SequenceMockup() {
  const timeline = useInView(0.15);

  return (
    <div>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--c-primary-container)",
          fontFamily: "var(--font-geist-sans), sans-serif", display: "block", marginBottom: 12,
        }}>
          See it in action
        </span>
        <h2 style={{
          fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, letterSpacing: "-0.04em",
          color: "var(--c-on-surface)", fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 0,
        }}>
          Drip sequences, on autopilot.
        </h2>
      </div>

      {/* Mockup container */}
      <div style={{
        background: "var(--c-surface-container-lowest)",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgb(var(--fx-shadow) / 0.35)",
        padding: 28,
        marginTop: 32,
        position: "relative",
      }}>
        {/* Enrolled badge */}
        <div style={{
          position: "absolute", top: 20, right: 20,
          background: "color-mix(in srgb, var(--c-success) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--c-success) 30%, transparent)",
          borderRadius: 20, padding: "6px 14px",
          fontSize: 12, color: "var(--c-success)",
          fontFamily: "var(--font-geist-sans), sans-serif", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--c-success)", flexShrink: 0 }} />
          3 contacts enrolled
        </div>

        {/* Header */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: "var(--c-on-surface)",
          fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 24,
        }}>
          Sequence: Welcome Flow
        </div>

        {/* Timeline */}
        <div
          ref={timeline.ref}
          style={{
            position: "relative",
            opacity: timeline.inView ? 1 : 0,
            transform: timeline.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {/* Vertical connector line */}
          <div style={{
            position: "absolute", left: 19, top: 0, bottom: 0, width: 2,
            background: "linear-gradient(to bottom, rgb(var(--fx-accent) / 0.4), rgb(var(--fx-accent) / 0.06))",
            pointerEvents: "none",
          }} />

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
                {/* Step circle */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: step.type === "stop" ? "rgb(var(--fx-accent) / 0.1)" : "rgb(var(--fx-accent) / 0.12)",
                  border: step.type === "stop" ? "2px solid var(--c-primary-container)" : "2px solid rgb(var(--fx-accent) / 0.4)",
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 18,
                    color: step.type === "stop" ? "var(--c-primary-container)" : "var(--c-primary)",
                  }}>
                    {step.type === "stop" ? "block" : "send"}
                  </span>
                </div>

                {/* Card */}
                <div style={{
                  flex: 1, background: "var(--c-surface-container-high)", borderRadius: 12, padding: "14px 18px",
                }}>
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    {step.type === "stop" ? (
                      <span style={{
                        background: "rgb(var(--fx-accent) / 0.1)", color: "var(--c-primary-container)",
                        padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                        fontFamily: "var(--font-geist-sans), sans-serif", letterSpacing: "0.06em",
                      }}>
                        STOP
                      </span>
                    ) : (
                      <span style={{
                        background: "rgb(var(--fx-accent) / 0.1)", color: "var(--c-primary-container)",
                        padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        fontFamily: "var(--font-geist-sans), sans-serif",
                      }}>
                        {step.day}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "var(--c-on-surface)",
                    fontFamily: "var(--font-geist-sans), sans-serif", marginBottom: 6,
                  }}>
                    {step.title}
                  </div>

                  {/* Preview */}
                  <div style={{
                    fontSize: 12, lineHeight: 1.6,
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    color: step.type === "stop" ? "var(--c-primary-container)" : "var(--c-on-surface-variant)",
                    fontStyle: step.type === "stop" ? "italic" : "normal",
                  }}>
                    {step.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────
const data: FeatureDetailData = {
  slug: "sequences",
  tag: "Sequences",
  heroTitle: "Follow up automatically.<br /><span style=\"color:var(--c-primary-container)\">Every time.</span>",
  heroSubtitle: "Space a series of WhatsApp messages over minutes or days. Each contact leaves the sequence the moment they reply.",
  overviewTitle: "Follow-ups that know when to stop.",
  overviewDesc: "Write a few messages, set how long to wait between them, and start the sequence for all your contacts or only those linked to a product. When someone replies they leave automatically, or a keyword in their reply can send them to a different step. The step funnel shows where people drop off.",
  capabilities: [
    { icon: "low_priority", title: "Steps with waits", desc: "Wait 5 minutes, an hour, or up to 7 days before each message." },
    { icon: "stop_circle", title: "Exit on reply", desc: "Turn on Exit sequence when contact replies, so you never chase someone who already answered." },
    { icon: "call_split", title: "Keyword branching", desc: "If a customer replies with a keyword, move them to the step you choose." },
    { icon: "bolt", title: "Quick Start presets", desc: "Start from Welcome Series, Follow-up Series or Re-engagement and edit from there." },
    { icon: "groups", title: "Choose the audience", desc: "Run it for all contacts, or only the ones linked to a product." },
    { icon: "insights", title: "Step funnel", desc: "Active, Completed and Exited counts, reply rate, average completion time, and how many contacts reached each step." },
  ],
  details: [
    { title: "Wait before a step", items: ["5 min", "1 hour", "4 hours", "1 day", "2 days", "3 days", "7 days"] },
    { title: "Controls", items: ["Start", "Pause", "Resume", "Cancel", "Analytics", "Delete"] },
    { title: "Analytics", items: ["Total Recipients", "Active", "Completed", "Exited", "Reply rate", "Avg. completion time", "Step Funnel", "Exit Reasons", "Current step per contact"] },
  ],
  howItWorks: [
    { step: "01", title: "Pick a starting point", desc: "Open Sequences and choose a Quick Start preset or a blank sequence." },
    { step: "02", title: "Write the steps", desc: "Add your messages and set the wait before each one." },
    { step: "03", title: "Add conditions", desc: "Optionally route a reply keyword to a specific step, and choose the audience." },
    { step: "04", title: "Press Start", desc: "Wazelo sends each step on time and removes anyone who replies." },
  ],
  faqs: [
    { q: "What happens when a contact replies?", a: "With Exit sequence when contact replies turned on, they leave the sequence right away. A keyword condition can instead move them to another step." },
    { q: "Can I add people after a sequence starts?", a: "Contacts are enrolled when you press Start. To reach newer contacts, start a new sequence." },
    { q: "Can steps include the contact's name?", a: "Not yet. Sequence messages are sent exactly as written." },
    { q: "How is this different from a campaign?", a: "A campaign sends one message once. A sequence sends several messages over time and stops for anyone who replies." },
  ],
  relatedFeatures: [
    { label: "Bulk Campaigns", href: "/features/campaigns",  icon: "campaign"    },
    { label: "Automation",     href: "/features/automation", icon: "bolt"        },
    { label: "Contacts CRM",   href: "/features/contacts",   icon: "group"       },
    { label: "Deals Pipeline", href: "/features/deals",      icon: "trending_up" },
  ],
  interactiveSection: <SequenceMockup />,
};

export default function SequencesClient() {
  return <FeatureDetailPage data={data} />;
}
