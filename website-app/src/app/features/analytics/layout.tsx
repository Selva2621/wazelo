import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "WhatsApp Analytics", item: "https://wazelo.in/features/analytics" },
  ],
};

export const metadata: Metadata = {
  title: "WhatsApp Analytics & Performance Dashboard",
  description:
    "Track WhatsApp delivery rates, agent response times, CSAT scores, and team performance in real time. Exportable reports and insights for Indian businesses.",
  keywords: [
    // Short-keys
    "WhatsApp analytics",
    "WhatsApp dashboard",
    "WhatsApp reports",
    "WhatsApp metrics",
    "WhatsApp CSAT",
    "WhatsApp delivery rate",
    "WhatsApp performance",
    "WA analytics",
    "WhatsApp insights",
    "WhatsApp KPIs",
    // Long-tail India
    "WhatsApp analytics dashboard India",
    "WhatsApp delivery rate tracking India",
    "WhatsApp business analytics India",
    "WhatsApp CSAT score tracking India",
    "WhatsApp team performance metrics India",
    "WhatsApp message analytics India",
    "WhatsApp CRM reporting India",
    "WhatsApp response time analytics",
    "WhatsApp business insights India",
    "WhatsApp campaign analytics India",
    "WhatsApp data reporting software",
    "WhatsApp team productivity analytics",
    "WhatsApp agent performance dashboard",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/analytics",
  },
  openGraph: {
    title: "WhatsApp Analytics & Performance Dashboard | Wazelo CRM",
    description:
      "Track delivery rates, CSAT scores, agent response times, and team performance. Exportable WhatsApp analytics reports for Indian businesses.",
    url: "https://wazelo.in/features/analytics",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp Analytics — Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Analytics | Wazelo CRM",
    description:
      "Delivery rates, CSAT scores, agent performance, exportable reports. Real-time WhatsApp analytics dashboard.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
