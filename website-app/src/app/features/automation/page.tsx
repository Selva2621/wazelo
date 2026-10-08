import type { Metadata } from "next";
import AutomationClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Automation Workflows",
  description: "WhatsApp automation rules that reply instantly when a message arrives, a contact is created, a lead status changes, or a Shopify order or cart comes in.",
  keywords: [
    "WhatsApp automation", "WhatsApp workflow automation", "no-code WhatsApp bot",
    "auto reply WhatsApp", "WhatsApp drip automation", "WhatsApp trigger workflow",
    "WhatsApp autoresponder", "WhatsApp business automation", "WhatsApp rule engine",
    "automated WhatsApp replies", "WhatsApp chatbot automation", "WhatsApp flow builder",
    "WhatsApp no code automation", "WhatsApp lead routing automation",
    "WhatsApp webhook integration", "WhatsApp delay messages",
    "WhatsApp auto tag contacts", "WhatsApp condition based reply",
    "WhatsApp sales automation India", "WhatsApp CRM automation",
  ],
  alternates: { canonical: "https://wazelo.in/features/automation" },
  openGraph: {
    title: "WhatsApp Automation Workflows | Wazelo CRM",
    description: "WhatsApp automation rules that reply instantly when a message arrives, a contact is created, a lead status changes, or a Shopify order or cart comes in.",
    url: "https://wazelo.in/features/automation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Automation Workflows | Wazelo CRM",
    description: "WhatsApp automation rules that reply instantly when a message arrives, a contact is created, a lead status changes, or a Shopify order or cart comes in.",
  },
};

export default function Page() {
  return <AutomationClient />;
}
