import type { Metadata } from "next";
import CsatClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CSAT Surveys",
  description: "Send a satisfaction survey from any WhatsApp chat. Collect 1 to 5 ratings with comments and see CSAT by agent.",
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
    description: "Send a satisfaction survey from any WhatsApp chat. Collect 1 to 5 ratings with comments and see CSAT by agent.",
    url: "https://wazelo.in/features/csat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CSAT Surveys | Wazelo CRM",
    description: "Send a satisfaction survey from any WhatsApp chat. Collect 1 to 5 ratings with comments and see CSAT by agent.",
  },
};

export default function Page() {
  return <CsatClient />;
}
