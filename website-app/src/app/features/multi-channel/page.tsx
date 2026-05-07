import type { Metadata } from "next";
import MultiChannelClient from "./client";

export const metadata: Metadata = {
  title: "Multi-Channel Inbox — WhatsApp, Instagram, Email",
  description: "Manage WhatsApp, Instagram DMs, Facebook Messenger, and Email from one shared inbox with unified automations and analytics.",
  keywords: [
    "multi-channel inbox", "WhatsApp Instagram inbox", "unified messaging inbox",
    "omnichannel WhatsApp CRM", "WhatsApp Facebook Messenger inbox",
    "WhatsApp email unified inbox", "omnichannel customer support India",
    "multi-channel CRM India", "WhatsApp Instagram DM inbox",
    "unified team inbox", "omnichannel messaging platform",
    "WhatsApp multi-channel support", "Instagram DM CRM",
    "Facebook Messenger CRM", "email and WhatsApp inbox",
    "multi-channel customer service India", "omnichannel WhatsApp India",
    "WhatsApp CRM multi-channel", "unified social inbox India",
    "WhatsApp omnichannel platform",
  ],
  alternates: { canonical: "https://wazelo.in/features/multi-channel" },
  openGraph: {
    title: "Multi-Channel Inbox — WhatsApp, Instagram, Email | Wazelo CRM",
    description: "Manage WhatsApp, Instagram DMs, Facebook Messenger, and Email from one shared inbox with unified automations and analytics.",
    url: "https://wazelo.in/features/multi-channel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multi-Channel Inbox — WhatsApp, Instagram, Email | Wazelo CRM",
    description: "Manage WhatsApp, Instagram DMs, Facebook Messenger, and Email from one shared inbox with unified automations and analytics.",
  },
};

export default function Page() {
  return <MultiChannelClient />;
}
