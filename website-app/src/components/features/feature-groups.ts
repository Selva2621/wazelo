// The 18 feature pages grouped by the job they do for a lead. One list for the homepage
// feature list, the /features hub and the header's Features menu, so they never drift.

export interface FeatureItem {
  label: string;
  desc: string;
  href: string;
  isNew?: boolean;
}

export interface FeatureGroup {
  key: string;
  /** Short name used in the menu and column headings. */
  name: string;
  /** Section heading on the /features hub. */
  title: string;
  /** One line under the heading on the hub. */
  intro: string;
  items: FeatureItem[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "catch",
    name: "Catch",
    title: "Catch every lead",
    intro: "Leads from your ads, your website and every chat app land in one list.",
    items: [
      { label: "Meta lead ads", desc: "Facebook and Instagram form leads land in your inbox instantly.", href: "/features/lead-ads", isNew: true },
      { label: "Website chat", desc: "A chat bubble on your site that turns visitors into leads.", href: "/features/website-chat", isNew: true },
      { label: "Lead finder", desc: "Find businesses on Google Maps and business directories to message.", href: "/features/lead-finder", isNew: true },
      { label: "Contacts and groups", desc: "Every lead in one list, tagged and grouped.", href: "/features/contacts" },
      { label: "Instagram, Messenger, email", desc: "Every channel in the same inbox.", href: "/features/multi-channel" },
    ],
  },
  {
    key: "reply",
    name: "Reply",
    title: "Reply in seconds",
    intro: "Your team and the AI answer from one inbox, on one WhatsApp number.",
    items: [
      { label: "Shared inbox", desc: "Your whole team on one WhatsApp number.", href: "/features/shared-inbox" },
      { label: "AI assistant", desc: "Suggests replies from your own prices and FAQs.", href: "/features/ai-assistant", isNew: true },
      { label: "Chatbot builder", desc: "Answers common questions on its own.", href: "/features/chatbot" },
      { label: "Campaigns", desc: "Send an offer to a group with approved templates.", href: "/features/campaigns" },
    ],
  },
  {
    key: "follow-up",
    name: "Follow up",
    title: "Follow up until they buy",
    intro: "The next message goes out on time, and stops the moment they reply.",
    items: [
      { label: "Sequences", desc: "Follow-ups that stop the moment the lead replies.", href: "/features/sequences" },
      { label: "Automation rules", desc: "Tag, assign and update leads automatically.", href: "/features/automation" },
      { label: "Lead scoring", desc: "See at a glance who is hot and who is cold.", href: "/features/lead-scoring" },
      { label: "Mobile app", desc: "Reply from your phone, wherever you are.", href: "/features/mobile-app", isNew: true },
    ],
  },
  {
    key: "close",
    name: "Close",
    title: "Close and keep track",
    intro: "Send the quote, move the deal and see what is working.",
    items: [
      { label: "Proposals", desc: "Send a quote on WhatsApp, accepted from a link.", href: "/features/proposals", isNew: true },
      { label: "Deals pipeline", desc: "Track every deal from enquiry to paid.", href: "/features/deals" },
      { label: "CSAT surveys", desc: "Ask customers how you did, right in the chat.", href: "/features/csat" },
      { label: "Analytics", desc: "Reply times, conversions and team performance.", href: "/features/analytics" },
      { label: "API, webhooks and MCP", desc: "Connect Wazelo to the rest of your tools.", href: "/features/developer-api" },
    ],
  },
];

export const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.items);
