"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "proposals",
  tag: "Proposals",
  heroTitle: "Proposals that<br /><span style=\"color:#ffb77d\">follow the chat.</span>",
  heroSubtitle: "Draft a proposal from the conversation, send it on WhatsApp and know when the client opens it.",
  heroScreen: "/media/features/proposals.jpg",
  overviewTitle: "From chat to accepted.",
  overviewDesc: "AI writes a first draft from your chat with the client. You edit it, send a link and the deal moves with it.",
  capabilities: [
    { icon: "auto_awesome", title: "AI first draft", desc: "AI drafts scope, line items and terms from your chat with the client." },
    { icon: "edit", title: "Edit and improve", desc: "Change anything, or ask AI to improve the wording." },
    { icon: "send", title: "Send on WhatsApp", desc: "Send the link on WhatsApp, or copy it and share it yourself." },
    { icon: "visibility", title: "Know when it's viewed", desc: "You're notified when the client opens it." },
    { icon: "task_alt", title: "Accept or ask for changes", desc: "The client accepts or asks for changes from the link." },
    { icon: "view_kanban", title: "Deal moves with it", desc: "Sending moves the deal to its proposal stage and accepting marks it won." },
    { icon: "picture_as_pdf", title: "PDF copy", desc: "Download any proposal as a PDF." },
    { icon: "event_busy", title: "Valid till", desc: "Set an expiry date so old prices don't stay open." },
  ],
  howItWorks: [
    { step: "01", title: "Draft", desc: "Start from a contact or deal and let AI write the first version." },
    { step: "02", title: "Edit", desc: "Check the scope, prices and terms." },
    { step: "03", title: "Send", desc: "Send the link on WhatsApp." },
    { step: "04", title: "Follow up", desc: "See when it's viewed and what the client decided." },
  ],
  relatedFeatures: [
    { label: "Deals", href: "/features/deals", icon: "view_kanban" },
    { label: "AI assistant", href: "/features/ai-assistant", icon: "auto_awesome" },
    { label: "Shared inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Contacts", href: "/features/contacts", icon: "group" },
  ],
};

export default function ProposalsClient() {
  return <FeatureDetailPage data={data} />;
}
