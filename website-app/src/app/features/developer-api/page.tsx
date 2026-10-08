import type { Metadata } from "next";
import DeveloperApiClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CRM REST API & Webhooks",
  description: "Wazelo REST API for WhatsApp: send messages, bulk send to 100 numbers, manage contacts and templates, and get signed webhooks for 11 events.",
  keywords: [
    "WhatsApp CRM API", "WhatsApp REST API", "WhatsApp webhook", "WhatsApp API integration",
    "Wazelo API", "WhatsApp API developer",
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
    description: "Wazelo REST API for WhatsApp: send messages, bulk send to 100 numbers, manage contacts and templates, and get signed webhooks for 11 events.",
    url: "https://wazelo.in/features/developer-api",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM REST API & Webhooks | Wazelo CRM",
    description: "Wazelo REST API for WhatsApp: send messages, bulk send to 100 numbers, manage contacts and templates, and get signed webhooks for 11 events.",
  },
};

export default function Page() {
  return <DeveloperApiClient />;
}
