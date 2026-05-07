import type { Metadata } from "next";
import CsatClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CSAT Surveys",
  description: "Auto-send satisfaction surveys after every resolved WhatsApp conversation. Collect scores and track agent performance.",
  keywords: [
    "WhatsApp CSAT survey", "customer satisfaction WhatsApp", "WhatsApp feedback survey",
    "post-chat survey WhatsApp", "WhatsApp customer rating",
    "WhatsApp satisfaction score", "WhatsApp NPS survey",
    "WhatsApp review collection", "WhatsApp star rating survey",
    "WhatsApp CSAT tool", "WhatsApp customer feedback",
    "WhatsApp support quality score", "WhatsApp agent rating",
    "WhatsApp post-resolution survey", "customer feedback WhatsApp India",
    "WhatsApp service rating", "WhatsApp CRM CSAT",
    "WhatsApp customer experience score", "CSAT WhatsApp India",
    "WhatsApp feedback automation",
  ],
  alternates: { canonical: "https://wazelo.in/features/csat" },
  openGraph: {
    title: "WhatsApp CSAT Surveys | Wazelo CRM",
    description: "Auto-send satisfaction surveys after every resolved WhatsApp conversation. Collect scores and track agent performance.",
    url: "https://wazelo.in/features/csat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CSAT Surveys | Wazelo CRM",
    description: "Auto-send satisfaction surveys after every resolved WhatsApp conversation. Collect scores and track agent performance.",
  },
};

export default function Page() {
  return <CsatClient />;
}
