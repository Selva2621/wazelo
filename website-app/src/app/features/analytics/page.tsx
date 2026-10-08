import type { Metadata } from "next";
import AnalyticsClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp CRM Analytics Dashboard",
  description: "WhatsApp analytics for your team: messages, response time, delivery and conversion rate, plus peak hours and per-agent performance for managers.",
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
    description: "WhatsApp analytics for your team: messages, response time, delivery and conversion rate, plus peak hours and per-agent performance for managers.",
    url: "https://wazelo.in/features/analytics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM Analytics Dashboard | Wazelo CRM",
    description: "WhatsApp analytics for your team: messages, response time, delivery and conversion rate, plus peak hours and per-agent performance for managers.",
  },
};

export default function Page() {
  return <AnalyticsClient />;
}
