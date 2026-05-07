import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference",
  description:
    "Wazelo CRM REST API reference. Integrate WhatsApp messaging, contacts, campaigns, and automation into your own applications using the Wazelo API.",
  keywords: [
    // Short-keys
    "WhatsApp CRM API",
    "Wazelo API",
    "WhatsApp API",
    "WA API",
    "WhatsApp REST API",
    "WhatsApp webhook",
    "WhatsApp developer API",
    // Long-tail
    "Wazelo CRM API reference India",
    "WhatsApp messaging API India",
    "WhatsApp automation API India",
    "CRM REST API WhatsApp India",
    "WhatsApp API integration India",
    "WhatsApp API for developers India",
    "WhatsApp business API documentation",
    "Wazelo API docs",
    "WhatsApp CRM webhook integration",
  ],
  alternates: {
    canonical: "https://wazelo.in/api-reference",
  },
  openGraph: {
    title: "Wazelo CRM API Reference",
    description:
      "Integrate WhatsApp messaging, contacts, campaigns, and automation into your own applications using the Wazelo REST API.",
    url: "https://wazelo.in/api-reference",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Wazelo CRM API Reference" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wazelo CRM API Reference",
    description: "Integrate WhatsApp messaging, contacts, campaigns and automation via Wazelo REST API.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
