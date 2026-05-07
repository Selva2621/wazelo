import type { Metadata } from "next";
import AutomationClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Automation Workflows",
  description: "Build no-code WhatsApp automation — auto-replies, lead routing, drip sequences, and webhook integrations. Zero code required.",
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
    description: "Build no-code WhatsApp automation — auto-replies, lead routing, drip sequences, and webhook integrations. Zero code required.",
    url: "https://wazelo.in/features/automation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Automation Workflows | Wazelo CRM",
    description: "Build no-code WhatsApp automation — auto-replies, lead routing, drip sequences, and webhook integrations. Zero code required.",
  },
};

export default function Page() {
  return <AutomationClient />;
}
