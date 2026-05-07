import type { Metadata } from "next";
import DeveloperApiClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CRM REST API & Webhooks",
  description: "Full REST API, webhook subscriptions, and API key management for teams building custom integrations on top of Wazelo CRM.",
  keywords: [
    "WhatsApp CRM API", "WhatsApp REST API", "WhatsApp webhook", "WhatsApp API integration",
    "Wazelo API", "WhatsApp Business API India", "WhatsApp API developer",
    "WhatsApp send message API", "WhatsApp API documentation",
    "WhatsApp CRM webhook", "WhatsApp API key management",
    "WhatsApp API for business India", "custom WhatsApp integration",
    "WhatsApp API endpoint", "WhatsApp API platform",
    "WhatsApp developer tools India", "WhatsApp API software",
    "integrate WhatsApp API", "WhatsApp CRM developer API",
    "WhatsApp API automation",
  ],
  alternates: { canonical: "https://wazelo.in/features/developer-api" },
  openGraph: {
    title: "WhatsApp CRM REST API & Webhooks | Wazelo CRM",
    description: "Full REST API, webhook subscriptions, and API key management for teams building custom integrations on top of Wazelo CRM.",
    url: "https://wazelo.in/features/developer-api",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM REST API & Webhooks | Wazelo CRM",
    description: "Full REST API, webhook subscriptions, and API key management for teams building custom integrations on top of Wazelo CRM.",
  },
};

export default function Page() {
  return <DeveloperApiClient />;
}
