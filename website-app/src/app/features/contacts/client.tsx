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
    A: "linear-gradient(135deg, var(--c-outline-variant), var(--c-primary))",
    V: "linear-gradient(135deg, var(--c-primary-container), var(--c-primary-container))",
    S: "linear-gradient(135deg, #10b981, var(--c-success))",
    K: "linear-gradient(135deg, #ef4444, var(--c-error))",
    D: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    R: "linear-gradient(135deg, #06b6d4, var(--c-code-cyan))",
  };
  return gradients[name[0]] ?? "linear-gradient(135deg, var(--c-outline-variant), var(--c-primary))";
}

function scoreStyle(score: number): React.CSSProperties {
  if (score >= 70) return { background: "color-mix(in srgb, var(--c-success) 12%, transparent)", color: "var(--c-success)" };
  if (score >= 40) return { background: "rgb(var(--fx-accent) / 0.12)", color: "var(--c-primary-container)" };
  return { background: "color-mix(in srgb, var(--c-error) 12%, transparent)", color: "#ef4444" };
}

function tagBadgeStyle(tag: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    "Hot Lead": { background: "rgb(var(--fx-accent) / 0.12)", color: "var(--c-primary-container)", border: "1px solid rgb(var(--fx-accent) / 0.3)" },
    "Nurture":  { background: "rgb(var(--fx-accent) / 0.12)", color: "var(--c-primary-container)", border: "1px solid rgb(var(--fx-accent) / 0.25)" },
    "Customer": { background: "color-mix(in srgb, var(--c-success) 12%, transparent)", color: "var(--c-success)", border: "1px solid color-mix(in srgb, var(--c-success) 25%, transparent)" },
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
        <p style={{ fontSize: 11, color: "var(--c-primary-container)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          See it in action
        </p>
        <h3 style={{ fontSize: 32, fontWeight: 700, color: "var(--c-on-surface)", margin: 0 }}>
          The contacts dashboard, live.
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

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search contacts..."
            style={{
              background: "var(--c-surface-container-high)",
              border: "1px solid rgb(var(--fx-ink) / 0.08)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              color: "var(--c-on-surface)",
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
                border: activeTag === tag ? "1px solid var(--c-primary-container)" : "1px solid rgb(var(--fx-ink) / 0.1)",
                background: activeTag === tag ? "var(--c-primary-container)" : "transparent",
                color: activeTag === tag ? "var(--c-on-primary)" : "var(--c-on-surface-variant)",
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
                    color: "var(--c-placeholder)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    paddingBottom: 10,
                    borderBottom: "1px solid rgb(var(--fx-ink) / 0.06)",
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
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)", paddingRight: 16 }}>
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
                        color: "var(--c-on-surface)",
                        flexShrink: 0,
                      }}>
                        {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 14, color: "var(--c-on-surface)", whiteSpace: "nowrap" }}>{contact.name}</span>
                    </div>
                  </td>
                  {/* Phone */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)", paddingRight: 16 }}>
                    <span style={{ fontSize: 13, color: "var(--c-on-surface-variant)", whiteSpace: "nowrap" }}>{contact.phone}</span>
                  </td>
                  {/* Tag */}
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)", paddingRight: 16 }}>
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
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)", paddingRight: 16 }}>
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
                  <td style={{ padding: "12px 0", borderBottom: "1px solid rgb(var(--fx-ink) / 0.04)" }}>
                    <span style={{ fontSize: 12, color: "var(--c-placeholder)" }}>{contact.last}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        <p style={{ fontSize: 13, color: "var(--c-placeholder)", marginTop: 14, marginBottom: 0 }}>
          Showing {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        </p>

      </div>
    </div>
  );
}

const data: FeatureDetailData = {
  slug: "contacts",
  tag: "Contacts CRM",
  heroTitle: "Every lead.<br /><span style=\"color:var(--c-primary-container)\">Always organised.</span>",
  heroSubtitle: "Every number that messages you becomes a contact. Tag, filter, import and assign them from one list.",
  overviewTitle: "Every number, with its story.",
  overviewDesc: "When a new number messages you, Wazelo creates the contact for you. Add tags, notes, custom fields and an owner, move people through New, Contacted, Interested, Converted and Closed, and switch between a list and a kanban board. Bring in more contacts from a CSV, Meta lead ads or the lead scraper, and export them whenever you need.",
  capabilities: [
    { icon: "person_add", title: "Created automatically", desc: "An inbound WhatsApp message creates the contact, owned by whoever's number received it." },
    { icon: "view_kanban", title: "List or kanban", desc: "Switch views, and drag contacts between lead statuses on the board." },
    { icon: "label", title: "Tags, notes and custom fields", desc: "Add your own fields in nine types, from text and dates to dropdowns and yes/no." },
    { icon: "filter_list", title: "Filters", desc: "Filter by status, owner, source, tags or products, and search by name." },
    { icon: "upload_file", title: "CSV import and export", desc: "Import with a preview that skips duplicate phone numbers. Export name, phone, status, owner, tags and more." },
    { icon: "travel_explore", title: "Lead Scraper", desc: "Find leads on Google Maps, Upwork, Freelancer.in, Truelancer and LinkedIn Jobs, up to 200 per run." },
  ],
  details: [
    { title: "Lead statuses", items: ["New", "Contacted", "Interested", "Converted", "Closed"] },
    { title: "Custom field types", items: ["Text", "Number", "Date", "Select", "Multi-select", "Yes / No", "URL", "Email", "Phone"] },
    { title: "Where contacts come from", items: ["WhatsApp messages", "CSV import", "Added by hand", "Meta lead ads", "Lead Scraper", "Developer API"] },
  ],
  howItWorks: [
    { step: "01", title: "Bring contacts in", desc: "Let inbound chats create them, or import a CSV with a Phone column." },
    { step: "02", title: "Organise them", desc: "Add tags, notes, custom fields and an owner to each contact." },
    { step: "03", title: "Work the pipeline", desc: "Drag contacts across lead statuses on the kanban board." },
    { step: "04", title: "Reach them", desc: "Use the same filters to build a campaign audience, or export the list." },
  ],
  faqs: [
    { q: "What does my CSV need?", a: "Only a Phone column. Name, Email, Status and Source are optional. You see a preview before importing, and duplicate phone numbers are skipped." },
    { q: "Can I merge duplicates?", a: "Yes. An Admin picks two contacts to merge, and the notes and tags move to the one you keep." },
    { q: "Where do lead ad leads go?", a: "Leads from Facebook and Instagram lead ads arrive as contacts and are shared round-robin across your team." },
    { q: "Who can delete contacts?", a: "Admins and Managers. Merging contacts is for Admins only." },
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
