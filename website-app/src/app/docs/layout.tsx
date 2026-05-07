import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Wazelo CRM documentation. Setup guides, integration tutorials, API references, and how-to articles for your WhatsApp CRM platform.",
  keywords: [
    // Short-keys
    "Wazelo docs",
    "WhatsApp CRM docs",
    "WhatsApp CRM guide",
    "WhatsApp CRM tutorial",
    "WA CRM setup",
    "WhatsApp CRM help",
    // Long-tail
    "WhatsApp CRM documentation India",
    "Wazelo CRM setup guide",
    "WhatsApp Business API integration guide India",
    "WhatsApp automation setup guide",
    "WhatsApp chatbot tutorial India",
    "how to set up WhatsApp CRM India",
    "WhatsApp CRM onboarding guide",
    "Wazelo getting started guide",
  ],
  alternates: {
    canonical: "https://wazelo.in/docs",
  },
  openGraph: {
    title: "Wazelo CRM Documentation",
    description:
      "Setup guides, integration tutorials, API references, and how-to articles for your Wazelo WhatsApp CRM.",
    url: "https://wazelo.in/docs",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Wazelo CRM Docs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wazelo CRM Documentation",
    description: "Setup guides, integration tutorials, API references for Wazelo WhatsApp CRM.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
