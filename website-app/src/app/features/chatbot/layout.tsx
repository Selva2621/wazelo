import type { Metadata } from "next";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://wazelo.in" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://wazelo.in/#features" },
    { "@type": "ListItem", position: 3, name: "WhatsApp Chatbot Builder", item: "https://wazelo.in/features/chatbot" },
  ],
};

export const metadata: Metadata = {
  title: "WhatsApp Chatbot Builder | AI and No-Code Flows",
  description:
    "Build a WhatsApp AI chatbot or a no-code custom flow. Trigger on keywords, first messages, or button replies. Ask questions, branch on conditions, tag contacts, call an API, and assign the chat to an agent.",
  keywords: [
    // Short-keys
    "WhatsApp chatbot",
    "WhatsApp bot",
    "WhatsApp AI chatbot",
    "WhatsApp chatbot builder",
    "WA chatbot",
    "WhatsApp FAQ bot",
    "WhatsApp lead bot",
    "WhatsApp auto chat",
    "WhatsApp virtual assistant",
    "WhatsApp conversational AI",
    // Long-tail India
    "WhatsApp chatbot builder India",
    "no-code WhatsApp chatbot India",
    "WhatsApp AI chatbot for business India",
    "WhatsApp bot builder India",
    "WhatsApp chatbot for e-commerce India",
    "WhatsApp chatbot for real estate India",
    "WhatsApp chatbot for education India",
    "WhatsApp chatbot for healthcare India",
    "WhatsApp lead qualification chatbot India",
    "WhatsApp chatbot software India",
    "automated WhatsApp chat India",
    "WhatsApp chatbot without coding India",
    "WhatsApp chatbot for customer support India",
    "build WhatsApp chatbot India",
  ],
  alternates: {
    canonical: "https://wazelo.in/features/chatbot",
  },
  openGraph: {
    title: "WhatsApp Chatbot Builder | Wazelo CRM",
    description:
      "Build a WhatsApp AI chatbot or a no-code flow: ask questions, branch on answers, tag contacts, and assign the chat to an agent.",
    url: "https://wazelo.in/features/chatbot",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp Chatbot Builder | Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Chatbot Builder | Wazelo CRM",
    description:
      "WhatsApp AI chatbot or no-code flows: questions, conditions, tags, agent handoff. 14-day free trial.",
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
