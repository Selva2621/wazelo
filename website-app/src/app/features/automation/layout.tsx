import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "WhatsApp Automation", item: "https://wazelo.in/features/automation" },
  ],
};

export const metadata: Metadata = {
  title: "WhatsApp Automation & No-Code Workflow Builder",
  description:
    "No-code WhatsApp automation rules. Trigger on new messages, new contacts, status changes, schedules, no reply, Meta lead ads, or Shopify orders, then send a message, assign, tag, or update status. Included from the Growth plan, ₹999/mo.",
  keywords: [
    // Short-keys
    "WhatsApp automation",
    "WhatsApp auto reply",
    "WhatsApp bot",
    "WhatsApp workflow",
    "WhatsApp drip",
    "WhatsApp sequence",
    "WA automation",
    "WhatsApp trigger",
    "WhatsApp flow builder",
    "WhatsApp rule engine",
    // Long-tail India
    "WhatsApp marketing automation India",
    "no-code WhatsApp workflow India",
    "WhatsApp auto-reply tool India",
    "WhatsApp business automation India",
    "WhatsApp drip campaign India",
    "WhatsApp lead routing automation",
    "automated WhatsApp follow-up India",
    "WhatsApp workflow builder India",
    "WhatsApp sales automation India",
    "WhatsApp automation software India",
    "WhatsApp chatbot automation India",
    "WhatsApp message automation tool",
    "automate WhatsApp replies India",
    "WhatsApp follow up automation India",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/automation",
  },
  openGraph: {
    title: "WhatsApp Automation & No-Code Workflow Builder | Wazelo CRM",
    description:
      "No-code WhatsApp automation rules: auto-replies, chat assignment, tags, and status updates. Draft rules with AI and check execution logs. Included from the Growth plan, ₹999/mo.",
    url: "https://wazelo.in/features/automation",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp Automation | Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Automation | Wazelo CRM",
    description:
      "No-code WhatsApp automation rules: auto-replies, assignment, tags, status updates. Automation is included from the Growth plan, ₹999/mo.",
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
