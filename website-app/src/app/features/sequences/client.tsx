"use client";
import React from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";
import { useInView } from "@/lib/wazelo";

// ─── SequenceMockup ───────────────────────────────────────────────────────────
const steps = [
  { day: "Day 0",    title: "Welcome Message", preview: "Hi {{name}}, thanks for reaching out to Wazelo! Here's what you need to know to get started...", type: "message" },
  { day: "Day 2",    title: "Follow-Up",       preview: "Hey {{name}}, just checking in! Have you had a chance to explore our features? We'd love to help.", type: "message" },
  { day: "Day 5",    title: "Special Offer",   preview: "Hi {{name}}, we'd like to offer you an exclusive 20% discount. Use code WAZE20 at checkout.", type: "message" },
  { day: "On Reply", title: "Auto-Stop",       preview: "Contact replied - sequence paused automatically.", type: "stop" },
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
  heroSubtitle: "Multi-step WhatsApp drip sequences that enrol contacts, space messages by hours or days, and stop automatically the moment a contact replies.",
  overviewTitle: "Your follow-up runs itself.",
  overviewDesc: "Sales teams lose deals not because they had the wrong product, but because they forgot to follow up. Wazelo CRM Sequences let you build a timed series of WhatsApp messages that automatically send to enrolled contacts, and automatically stop the moment someone responds, so you never message someone who's already engaged.",
  capabilities: [
    { icon: "low_priority",  title: "Multi-step message flows",  desc: "Chain up to 10+ messages with individual delays between each step: hours, days, or weeks." },
    { icon: "person_add",    title: "Automatic enrolment",       desc: "Enrol contacts via automation rules, tags, or manual selection. Bulk-enrol from a filtered segment." },
    { icon: "stop_circle",   title: "Auto-stop on reply",        desc: "The sequence pauses automatically when a contact replies. No more messaging someone who's already talking to you." },
    { icon: "edit_note",     title: "Personalised messages",     desc: "Use contact field variables in each message, name, company, product, so every message feels 1:1." },
    { icon: "schedule",      title: "Send time controls",        desc: "Set sequences to send only within business hours. Avoid messaging contacts at 3am." },
    { icon: "insights",      title: "Sequence analytics",        desc: "Open rate, reply rate, and drop-off by step, so you know exactly which message is losing them." },
  ],
  howItWorks: [
    { step: "01", title: "Build your sequence",            desc: "Create a new sequence, give it a name, and add steps. Each step is a message with a delay before it sends." },
    { step: "02", title: "Write and personalise messages", desc: "Write each message using the editor. Insert contact field variables like {{first_name}} for personalisation." },
    { step: "03", title: "Enrol your contacts",            desc: "Add contacts manually, from a tag filter, or set an automation rule to enrol contacts automatically when they hit a trigger." },
    { step: "04", title: "Let it run",                     desc: "The sequence handles timing, delivery, and auto-stopping. Review analytics to optimise open and reply rates per step." },
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
