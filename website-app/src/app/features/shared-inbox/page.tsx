import type { Metadata } from "next";
import SharedInboxClient from "./client";

export const metadata: Metadata = {
  title: "Shared WhatsApp Inbox for Teams",
  description: "Manage all WhatsApp conversations in one shared team inbox. Assign, route, resolve, and track every message — together.",
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
    description: "Manage all WhatsApp conversations in one shared team inbox. Assign, route, resolve, and track every message — together.",
    url: "https://wazelo.in/features/shared-inbox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shared WhatsApp Inbox for Teams | Wazelo CRM",
    description: "Manage all WhatsApp conversations in one shared team inbox. Assign, route, resolve, and track every message — together.",
  },
};

export default function Page() {
  return <SharedInboxClient />;
}
