import type { Metadata } from "next";
import LeadScoringClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Lead Scoring",
  description: "Automatically score and rank leads based on engagement, profile, and behaviour — so your team focuses on the hottest leads.",
  keywords: [
    "WhatsApp lead scoring", "automatic lead qualification", "lead score WhatsApp CRM",
    "lead priority WhatsApp", "WhatsApp lead ranking",
    "WhatsApp lead quality score", "WhatsApp hot lead detection",
    "WhatsApp lead qualification automation", "lead scoring CRM India",
    "WhatsApp sales lead scoring", "WhatsApp lead engagement score",
    "WhatsApp lead management scoring", "WhatsApp lead prioritization",
    "WhatsApp CRM lead score", "best leads WhatsApp India",
    "WhatsApp lead behavior tracking", "WhatsApp CRM India lead scoring",
    "score leads WhatsApp", "WhatsApp sales intelligence",
    "WhatsApp qualified leads India",
  ],
  alternates: { canonical: "https://wazelo.in/features/lead-scoring" },
  openGraph: {
    title: "WhatsApp Lead Scoring | Wazelo CRM",
    description: "Automatically score and rank leads based on engagement, profile, and behaviour — so your team focuses on the hottest leads.",
    url: "https://wazelo.in/features/lead-scoring",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Lead Scoring | Wazelo CRM",
    description: "Automatically score and rank leads based on engagement, profile, and behaviour — so your team focuses on the hottest leads.",
  },
};

export default function Page() {
  return <LeadScoringClient />;
}
