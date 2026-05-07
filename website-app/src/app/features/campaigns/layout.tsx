import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "WhatsApp Bulk Campaigns", item: "https://wazelo.in/features/campaigns" },
  ],
};

export const metadata: Metadata = {
  title: "WhatsApp Bulk Campaigns & Broadcast Messaging",
  description:
    "Send personalised WhatsApp bulk messages to thousands of contacts. Real-time delivery tracking, smart retry logic, and analytics. Best WhatsApp broadcast software for Indian businesses.",
  keywords: [
    // Short-keys
    "WhatsApp bulk campaign",
    "WhatsApp broadcast",
    "WhatsApp bulk message",
    "WhatsApp mass message",
    "WhatsApp blast",
    "WhatsApp group broadcast",
    "WhatsApp bulk sender",
    "bulk WA message",
    "WA broadcast tool",
    "WhatsApp campaign",
    // Long-tail India
    "WhatsApp broadcast software India",
    "bulk WhatsApp messages India",
    "WhatsApp marketing campaign tool India",
    "WhatsApp mass messaging India",
    "WhatsApp campaign management India",
    "personalised WhatsApp broadcast India",
    "WhatsApp business campaign software",
    "WhatsApp delivery tracking India",
    "WhatsApp blast messaging tool India",
    "send bulk WhatsApp messages India",
    "WhatsApp promotional message India",
    "WhatsApp marketing software India",
    "bulk WhatsApp sender India",
    "WhatsApp campaign analytics India",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/campaigns",
  },
  openGraph: {
    title: "WhatsApp Bulk Campaigns & Broadcast Messaging | Wazelo CRM",
    description:
      "Broadcast personalised WhatsApp messages to thousands. Real-time delivery tracking and smart retry logic. Best bulk WhatsApp campaign tool in India.",
    url: "https://wazelo.in/features/campaigns",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp Bulk Campaigns — Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Bulk Campaigns | Wazelo CRM",
    description:
      "Send personalised WhatsApp broadcasts to thousands. Real-time delivery tracking. Starts ₹499/mo.",
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
