import type { Metadata } from "next";
import ContactsClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Contacts CRM",
  description: "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
  keywords: [
    "WhatsApp contacts CRM", "WhatsApp contact management", "WhatsApp lead management",
    "contact tagging WhatsApp", "WhatsApp CRM India",
    "WhatsApp customer database", "WhatsApp contact segmentation",
    "WhatsApp CRM contacts", "import contacts WhatsApp CRM",
    "WhatsApp lead tagging", "WhatsApp custom fields contacts",
    "WhatsApp contact history", "WhatsApp conversation history",
    "WhatsApp CRM for sales", "manage WhatsApp customers",
    "WhatsApp contact search", "WhatsApp CRM software India",
    "WhatsApp contacts export", "WhatsApp lead database India",
    "best CRM for WhatsApp India",
  ],
  alternates: { canonical: "https://wazelo.in/features/contacts" },
  openGraph: {
    title: "WhatsApp Contacts CRM | Wazelo CRM",
    description: "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
    url: "https://wazelo.in/features/contacts",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Contacts CRM | Wazelo CRM",
    description: "Every WhatsApp number becomes a contact. Tags, custom fields, notes, owners, CSV import and export, merge, list or kanban views, and Meta lead ads.",
  },
};

export default function Page() {
  return <ContactsClient />;
}
