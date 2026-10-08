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
    "Send WhatsApp campaigns with text, media, or templates. Pick your audience by status, tags, source, or scraper run, schedule with a timezone, and see Sent, Delivered, Read, or Failed for each recipient.",
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
      "WhatsApp campaigns with audience filters, scheduling, pause and resume, and per-recipient delivery and read status.",
    url: "https://wazelo.in/features/campaigns",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp Bulk Campaigns | Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Bulk Campaigns | Wazelo CRM",
    description:
      "WhatsApp campaigns with scheduling and per-recipient delivery status. From ₹299/mo.",
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
