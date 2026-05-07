"use client";
import React, { useState, useEffect } from "react";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

type TagFilter = "All" | "Hot Lead" | "Nurture" | "Customer";

const allContacts = [
  { name: "Ananya Sharma", phone: "+91 98765 43210", tag: "Hot Lead", score: 87, last: "2h ago" },
  { name: "Vikram Patel",  phone: "+91 87654 32109", tag: "Customer",  score: 62, last: "1d ago" },
  { name: "Sneha Rao",     phone: "+91 76543 21098", tag: "Nurture",   score: 34, last: "3d ago" },
  { name: "Karan Mehta",   phone: "+91 65432 10987", tag: "Hot Lead",  score: 91, last: "30m ago" },
  { name: "Divya Nair",    phone: "+91 54321 09876", tag: "Customer",  score: 55, last: "5h ago" },
  { name: "Rohan Gupta",   phone: "+91 43210 98765", tag: "Nurture",   score: 28, last: "1w ago" },
];

const tagFilters: TagFilter[] = ["All", "Hot Lead", "Nurture", "Customer"];

// Deterministic avatar gradient based on first letter
function avatarGradient(name: string): string {
  const gradients: Record<string, string> = {
    A: "linear-gradient(135deg, #554336, #d97707)",
    V: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    S: "linear-gradient(135deg, #10b981, #34d399)",
    K: "linear-gradient(135deg, #ef4444, #f87171)",
    D: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    R: "linear-gradient(135deg, #06b6d4, #67e8f9)",
  };
  return gradients[name[0]] ?? "linear-gradient(135deg, #554336, #d97707)";
}

function scoreStyle(score: number): React.CSSProperties {
  if (score >= 70) return { background: "rgba(52,211,153,0.12)", color: "#34d399" };
  if (score >= 40) return { background: "rgba(251,191,36,0.12)", color: "#fbbf24" };
  return { background: "rgba(239,68,68,0.12)", color: "#ef4444" };
}

function tagBadgeStyle(tag: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    "Hot Lead": { background: "rgba(255,183,125,0.12)", color: "#ffb77d", border: "1px solid rgba(255,183,125,0.3)" },
    "Nurture":  { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" },
    "Customer": { background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" },
  };
  return map[tag] ?? {};
}

function ContactsMockup() {
  const [activeTag, setActiveTag] = useState<TagFilter>("All");
  const tagCycle = ["All", "Hot Lead", "Nurture", "Customer"] as const;
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % tagCycle.length;
      setActiveTag(tagCycle[i]);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const filtered = activeTag === "All"
    ? allContacts
    : allContacts.filter((c) => c.tag === activeTag);

  return (
    <div>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <p style={{ fontSize: 11, color: "#ffb77d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          See it in action
        </p>
        <h3 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: 0 }}>
          The contacts dashboard, live.
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

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search contacts..."
            style={{
              background: "#2a2a2a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              color: "#e5e2e1",
              flex: 1,
              minWidth: 160,
              outline: "none",
            }}
          />
          {tagFilters.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                border: activeTag === tag ? "1px solid #ffb77d" : "1px solid rgba(255,255,255,0.1)",
                background: activeTag === tag ? "#ffb77d" : "transparent",
                color: activeTag === tag ? "#4d2600" : "rgba(219,194,176,0.6)",
                transition: "all 0.15s ease",
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Phone", "Tag", "Score", "Last Active"].map((h) => (
                  <th key={h} style={{
                    fontSize: 11,
                    color: "rgba(219,194,176,0.35)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    paddingBottom: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    textAlign: "left",
                    fontWeight: 600,
                    paddingRight: 16,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.name}>
                  {/* Name + avatar */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingRight: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: avatarGradient(contact.name),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}>
                        {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 14, color: "#fff", whiteSpace: "nowrap" }}>{contact.name}</span>
                    </div>
                  </td>
                  {/* Phone */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingRight: 16 }}>
                    <span style={{ fontSize: 13, color: "rgba(219,194,176,0.5)", whiteSpace: "nowrap" }}>{contact.phone}</span>
                  </td>
                  {/* Tag */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingRight: 16 }}>
                    <span style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      ...tagBadgeStyle(contact.tag),
                    }}>
                      {contact.tag}
                    </span>
                  </td>
                  {/* Score */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingRight: 16 }}>
                    <span style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontWeight: 600,
                      ...scoreStyle(contact.score),
                    }}>
                      {contact.score}
                    </span>
                  </td>
                  {/* Last active */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(219,194,176,0.4)" }}>{contact.last}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        <p style={{ fontSize: 13, color: "rgba(219,194,176,0.35)", marginTop: 14, marginBottom: 0 }}>
          Showing {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        </p>

      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "contacts",
  tag: "Contacts CRM",
  heroTitle: "Every lead.<br /><span style=\"color:#ffb77d\">Always organised.</span>",
  heroSubtitle: "Tag, segment, search, and manage all your WhatsApp contacts and customers in one place. Full conversation history. Zero spreadsheets.",
  heroScreen: "/screens/05-contacts-management.png",
  overviewTitle: "Your contacts are your business.",
  overviewDesc: "Every WhatsApp number that messages you is a potential customer. Wazelo CRM automatically creates a contact profile for every conversation — with their name, number, tags, custom fields, and full message history — so your team always has context and your marketing always hits the right segment.",
  capabilities: [
    { icon: "group", title: "Unified contact profiles", desc: "Each contact has a profile with name, WhatsApp number, email, tags, custom fields, and full conversation history." },
    { icon: "label", title: "Tags & custom fields", desc: "Create your own tags and fields to capture anything — lead source, city, product interest, deal stage." },
    { icon: "filter_list", title: "Powerful segmentation", desc: "Filter contacts by any combination of tags, fields, last message date, or conversation status to build precise lists." },
    { icon: "upload_file", title: "CSV import & export", desc: "Bulk import contacts from a CSV or export your entire database at any time." },
    { icon: "search", title: "Instant search", desc: "Find any contact by name, number, email, or custom field value in milliseconds." },
    { icon: "history", title: "Full conversation history", desc: "Every message ever exchanged with a contact is stored and searchable — across all agents and channels." },
  ],
  howItWorks: [
    { step: "01", title: "Contacts are created automatically", desc: "Every new WhatsApp conversation creates a contact profile. Or import your existing list via CSV." },
    { step: "02", title: "Enrich with tags and custom fields", desc: "Add tags manually or via automation rules. Fill in custom fields to capture any data your business needs." },
    { step: "03", title: "Segment your audience", desc: "Use the filter builder to create precise segments for campaigns, reports, or workflow triggers." },
    { step: "04", title: "Act on your data", desc: "Launch a campaign to a segment, assign conversations to the right agent, or export a list for use outside Wazelo." },
  ],
  screens: [
    { src: "/screens/01-inbox-shared-team.png", caption: "Contact profiles visible in every conversation" },
  ],
  relatedFeatures: [
    { label: "Bulk Campaigns", href: "/features/campaigns", icon: "campaign" },
    { label: "Shared Inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Lead Scoring", href: "/features/lead-scoring", icon: "query_stats" },
    { label: "Deals Pipeline", href: "/features/deals", icon: "trending_up" },
  ],
  interactiveSection: <ContactsMockup />,
};

export default function ContactsClient() {
  return <FeatureDetailPage data={data} />;
}
