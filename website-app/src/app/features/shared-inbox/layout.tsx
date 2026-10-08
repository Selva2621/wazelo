import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "Shared WhatsApp Inbox", item: "https://wazelo.in/features/shared-inbox" },
  ],
};

export const metadata: Metadata = {
  title: "Shared WhatsApp Inbox for Teams",
  description:
    "A shared WhatsApp inbox for your team: assign chats, reply with media, buttons and / quick replies, and get AI summaries and reply suggestions.",
  keywords: [
    // Short-keys
    "shared WhatsApp inbox",
    "WhatsApp shared inbox",
    "WhatsApp team inbox",
    "WhatsApp multi agent",
    "WhatsApp multi-agent inbox",
    "WhatsApp team chat",
    "WhatsApp help desk",
    "WhatsApp ticketing",
    "WhatsApp assign chat",
    "team WhatsApp number",
    // Long-tail India
    "shared WhatsApp inbox India",
    "WhatsApp CRM team collaboration",
    "shared WhatsApp number for team India",
    "WhatsApp inbox management India",
    "multi-agent WhatsApp support India",
    "WhatsApp customer support inbox",
    "WhatsApp help desk India",
    "team WhatsApp management tool",
    "WhatsApp team collaboration software India",
    "multiple agents one WhatsApp number India",
    "WhatsApp inbox for sales team India",
    "WhatsApp support team software",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/shared-inbox",
  },
  openGraph: {
    title: "Shared WhatsApp Inbox for Teams | Wazelo CRM",
    description:
      "A shared WhatsApp inbox for your team: assign chats, reply with media, buttons and / quick replies, and get AI summaries and reply suggestions.",
    url: "https://wazelo.in/features/shared-inbox",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Shared WhatsApp Inbox | Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shared WhatsApp Inbox for Teams | Wazelo CRM",
    description:
      "A shared WhatsApp inbox for your team: assign chats, reply with media, buttons and / quick replies, and get AI summaries and reply suggestions.",
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
