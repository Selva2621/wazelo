import type { Metadata } from "next";
import AnalyticsClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CRM Analytics Dashboard",
  description: "Track response times, delivery rates, agent performance, and CSAT scores across all your WhatsApp conversations.",
  keywords: [
    "WhatsApp analytics", "WhatsApp CRM dashboard", "WhatsApp response time tracking",
    "WhatsApp agent performance", "WhatsApp CSAT analytics",
    "WhatsApp business analytics", "WhatsApp message delivery analytics",
    "WhatsApp team performance report", "WhatsApp conversation analytics",
    "WhatsApp CRM reporting", "WhatsApp insights dashboard",
    "WhatsApp agent leaderboard", "WhatsApp resolution rate",
    "WhatsApp read rate analytics", "WhatsApp reply rate tracking",
    "WhatsApp customer service analytics", "WhatsApp KPI dashboard",
    "WhatsApp business intelligence", "WhatsApp metrics India",
    "WhatsApp CRM reports India",
  ],
  alternates: { canonical: "https://wazelo.in/features/analytics" },
  openGraph: {
    title: "WhatsApp CRM Analytics Dashboard | Wazelo CRM",
    description: "Track response times, delivery rates, agent performance, and CSAT scores across all your WhatsApp conversations.",
    url: "https://wazelo.in/features/analytics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM Analytics Dashboard | Wazelo CRM",
    description: "Track response times, delivery rates, agent performance, and CSAT scores across all your WhatsApp conversations.",
  },
};

export default function Page() {
  return <AnalyticsClient />;
}
