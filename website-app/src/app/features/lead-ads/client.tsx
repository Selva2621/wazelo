"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "lead-ads",
  tag: "Meta lead ads",
  heroTitle: "Ad leads,<br /><span style=\"color:#ffb77d\">greeted in seconds.</span>",
  heroSubtitle: "Facebook and Instagram lead form entries arrive straight from Meta. Wazelo welcomes each lead on WhatsApp before they forget your ad.",
  heroScreen: "/media/features/lead-ads.jpg",
  overviewTitle: "No sheets. No copy-paste.",
  overviewDesc: "Leads come in through Meta's webhook, not a spreadsheet sync. Each one becomes a contact, gets an owner and starts its follow-up right away.",
  capabilities: [
    { icon: "bolt", title: "Straight from Meta", desc: "Each lead form entry arrives through Meta's webhook as it happens." },
    { icon: "chat", title: "WhatsApp welcome", desc: "A \"Lead ad received\" automation messages the lead on WhatsApp within seconds." },
    { icon: "mail", title: "One welcome email", desc: "Leads with an email address get one welcome email, never two." },
    { icon: "person_add", title: "Owner assigned", desc: "Each lead gets an owner, and a reminder if nobody contacts it." },
    { icon: "campaign", title: "Ad details in messages", desc: "Messages can use the campaign, ad name and form answers." },
    { icon: "filter_alt", title: "Per form or page", desc: "Run different automations per platform, page or lead form." },
  ],
  howItWorks: [
    { step: "01", title: "Connect Meta", desc: "Add your Meta app details and point its lead webhook at Wazelo." },
    { step: "02", title: "Set up the welcome", desc: "Turn on a \"Lead ad received\" automation and write the message." },
    { step: "03", title: "Leads arrive", desc: "Each new lead shows up live with its campaign and ad." },
    { step: "04", title: "Follow up", desc: "The owner picks up the chat in the inbox." },
  ],
  relatedFeatures: [
    { label: "Automation", href: "/features/automation", icon: "bolt" },
    { label: "Contacts", href: "/features/contacts", icon: "group" },
    { label: "Lead finder", href: "/features/lead-finder", icon: "travel_explore" },
    { label: "Shared inbox", href: "/features/shared-inbox", icon: "forum" },
  ],
};

export default function LeadAdsClient() {
  return <FeatureDetailPage data={data} />;
}
