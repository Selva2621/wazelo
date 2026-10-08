import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "Contacts CRM", item: "https://wazelo.in/features/contacts" },
  ],
};

export const metadata: Metadata = {
  title: "WhatsApp Contacts CRM | Lead Management",
  description:
    "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
  keywords: [
    // Short-keys
    "WhatsApp contacts",
    "WhatsApp CRM contacts",
    "WhatsApp leads",
    "WhatsApp contact list",
    "WhatsApp customer list",
    "WhatsApp contact tags",
    "WhatsApp segments",
    "WA contacts CRM",
    "WhatsApp phonebook",
    "WhatsApp database",
    // Long-tail India
    "WhatsApp contacts CRM India",
    "WhatsApp lead management India",
    "WhatsApp contact management software India",
    "WhatsApp customer database India",
    "lead management WhatsApp India",
    "WhatsApp lead tracking India",
    "WhatsApp contact segmentation India",
    "import contacts WhatsApp CRM India",
    "WhatsApp CRM lead nurturing India",
    "WhatsApp contact tagging India",
    "WhatsApp customer segmentation tool India",
    "manage WhatsApp leads India",
    "WhatsApp prospect management India",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/contacts",
  },
  openGraph: {
    title: "WhatsApp Contacts CRM | Wazelo CRM",
    description:
      "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
    url: "https://wazelo.in/features/contacts",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Contacts CRM | Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Contacts CRM | Wazelo CRM",
    description:
      "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
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
