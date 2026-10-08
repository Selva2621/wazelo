import type { Metadata } from "next";
import SharedInboxClient from "./client";

export const metadata: Metadata = {
  title: "Shared WhatsApp Inbox for Teams",
  description: "One shared WhatsApp inbox for your team. All, Unread, and Mine tabs, chat assignment, labels, and quick replies with \"/\".",
  keywords: [
    "shared WhatsApp inbox", "WhatsApp team inbox", "WhatsApp CRM shared inbox",
    "multi-agent WhatsApp", "WhatsApp helpdesk", "team WhatsApp management",
    "Wazelo CRM inbox", "WhatsApp business inbox", "WhatsApp conversation management",
    "WhatsApp customer support team", "assign WhatsApp conversations",
    "WhatsApp agent routing", "WhatsApp ticket management", "shared inbox India",
    "WhatsApp support software", "WhatsApp CRM India", "best WhatsApp CRM",
    "WhatsApp team collaboration", "WhatsApp inbox for business",
  ],
  alternates: { canonical: "https://wazelo.in/features/shared-inbox" },
  openGraph: {
    title: "Shared WhatsApp Inbox for Teams | Wazelo CRM",
    description: "One shared WhatsApp inbox for your team. All, Unread, and Mine tabs, chat assignment, labels, and quick replies with \"/\".",
    url: "https://wazelo.in/features/shared-inbox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shared WhatsApp Inbox for Teams | Wazelo CRM",
    description: "One shared WhatsApp inbox for your team. All, Unread, and Mine tabs, chat assignment, labels, and quick replies with \"/\".",
  },
};

export default function Page() {
  return <SharedInboxClient />;
}
