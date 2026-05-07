import type { Metadata } from "next";
import SequencesClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Drip Sequences",
  description: "Automated multi-step WhatsApp drip sequences. Enrol contacts, space messages by days, and stop the moment they reply.",
  keywords: [
    "WhatsApp drip sequence", "WhatsApp follow up automation", "WhatsApp nurture sequence",
    "automated WhatsApp messages", "WhatsApp drip campaign",
    "WhatsApp message sequence", "WhatsApp follow up messages",
    "WhatsApp automated follow up", "WhatsApp drip marketing",
    "WhatsApp sequence builder", "WhatsApp multi-step campaign",
    "WhatsApp lead nurturing", "WhatsApp sales sequence",
    "WhatsApp scheduled follow up", "WhatsApp onboarding sequence",
    "WhatsApp drip automation India", "WhatsApp message scheduling",
    "WhatsApp CRM sequences", "automated lead follow up WhatsApp",
    "WhatsApp nurture campaign India",
  ],
  alternates: { canonical: "https://wazelo.in/features/sequences" },
  openGraph: {
    title: "WhatsApp Drip Sequences | Wazelo CRM",
    description: "Automated multi-step WhatsApp drip sequences. Enrol contacts, space messages by days, and stop the moment they reply.",
    url: "https://wazelo.in/features/sequences",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Drip Sequences | Wazelo CRM",
    description: "Automated multi-step WhatsApp drip sequences. Enrol contacts, space messages by days, and stop the moment they reply.",
  },
};

export default function Page() {
  return <SequencesClient />;
}
