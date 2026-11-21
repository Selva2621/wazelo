"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "website-chat",
  tag: "Website chat",
  heroTitle: "Website visitors,<br /><span style=\"color:#ffb77d\">in your inbox.</span>",
  heroSubtitle: "One chat widget for every site you run. The AI answers first and your team takes over when needed.",
  heroScreen: "/media/features/website-chat.jpg",
  overviewTitle: "One widget. Every site.",
  overviewDesc: "Paste the same snippet on each website. The inbox shows which site each chat came from.",
  capabilities: [
    { icon: "code", title: "One snippet", desc: "One widget per workspace, shared by all your websites." },
    { icon: "splitscreen", title: "Split by site", desc: "The inbox groups website chats by the site they started on." },
    { icon: "badge", title: "Visitor details", desc: "Visitors give their name, mobile and email before they chat." },
    { icon: "verified_user", title: "Consent first", desc: "A visitor becomes a contact only if they tick the consent box." },
    { icon: "auto_awesome", title: "AI answers", desc: "Your AI assistant replies from your knowledge." },
    { icon: "support_agent", title: "Hand over", desc: "Visitors can ask for a person, and your team gets notified." },
  ],
  howItWorks: [
    { step: "01", title: "Set up the widget", desc: "Pick its colour, position and welcome message in Settings → Chat widget." },
    { step: "02", title: "Add it to your sites", desc: "Paste the snippet on each website." },
    { step: "03", title: "Visitors chat", desc: "They fill in their details and the AI answers." },
    { step: "04", title: "Your team takes over", desc: "Accept the chat in the inbox when a visitor needs a person." },
  ],
  relatedFeatures: [
    { label: "AI assistant", href: "/features/ai-assistant", icon: "auto_awesome" },
    { label: "Shared inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Contacts", href: "/features/contacts", icon: "group" },
    { label: "Mobile app", href: "/features/mobile-app", icon: "smartphone" },
  ],
};

export default function WebsiteChatClient() {
  return <FeatureDetailPage data={data} />;
}
