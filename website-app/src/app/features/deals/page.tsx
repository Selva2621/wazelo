import type { Metadata } from "next";
import DealsClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CRM Deals Pipeline",
  description: "Track every deal through stages with a full CRM pipeline inside your WhatsApp workflow. Forecast revenue without switching tools.",
  keywords: [
    "WhatsApp CRM pipeline", "WhatsApp deals tracking", "WhatsApp sales pipeline",
    "CRM for WhatsApp sales", "deal stage WhatsApp",
    "WhatsApp sales CRM India", "WhatsApp deal management",
    "WhatsApp Kanban pipeline", "WhatsApp revenue tracking",
    "WhatsApp CRM for real estate", "WhatsApp deals CRM",
    "WhatsApp sales funnel", "WhatsApp opportunity management",
    "WhatsApp CRM deal tracking", "WhatsApp sales forecast",
    "sales pipeline WhatsApp India", "WhatsApp CRM for teams",
    "WhatsApp deal board", "CRM pipeline WhatsApp India",
    "WhatsApp sales management software",
  ],
  alternates: { canonical: "https://wazelo.in/features/deals" },
  openGraph: {
    title: "WhatsApp CRM Deals Pipeline | Wazelo CRM",
    description: "Track every deal through stages with a full CRM pipeline inside your WhatsApp workflow. Forecast revenue without switching tools.",
    url: "https://wazelo.in/features/deals",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM Deals Pipeline | Wazelo CRM",
    description: "Track every deal through stages with a full CRM pipeline inside your WhatsApp workflow. Forecast revenue without switching tools.",
  },
};

export default function Page() {
  return <DealsClient />;
}
