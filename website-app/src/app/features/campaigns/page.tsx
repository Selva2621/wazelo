import type { Metadata } from "next";
import CampaignsClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Bulk Campaign Broadcasting",
  description: "Send personalised WhatsApp broadcasts to thousands of contacts. Schedule, segment, and track delivery, reads, and replies in real time.",
  keywords: [
    "WhatsApp bulk campaigns", "WhatsApp broadcast", "WhatsApp mass messaging",
    "WhatsApp marketing India", "bulk WhatsApp sender", "WhatsApp campaign tool",
    "WhatsApp promotional messages", "WhatsApp newsletter", "bulk WhatsApp messages",
    "WhatsApp marketing automation", "WhatsApp broadcast list", "WhatsApp bulk send",
    "WhatsApp marketing software India", "WhatsApp business campaigns",
    "scheduled WhatsApp messages", "WhatsApp campaign analytics",
    "WhatsApp template messages", "WhatsApp marketing CRM",
    "send bulk WhatsApp India", "WhatsApp blast messages",
  ],
  alternates: { canonical: "https://wazelo.in/features/campaigns" },
  openGraph: {
    title: "WhatsApp Bulk Campaign Broadcasting | Wazelo CRM",
    description: "Send personalised WhatsApp broadcasts to thousands of contacts. Schedule, segment, and track delivery, reads, and replies in real time.",
    url: "https://wazelo.in/features/campaigns",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Bulk Campaign Broadcasting | Wazelo CRM",
    description: "Send personalised WhatsApp broadcasts to thousands of contacts. Schedule, segment, and track delivery, reads, and replies in real time.",
  },
};

export default function Page() {
  return <CampaignsClient />;
}
