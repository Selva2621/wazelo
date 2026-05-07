import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Wazelo CRM — Sales, Support & Partnerships",
  description:
    "Get in touch with the Wazelo CRM team. WhatsApp CRM sales enquiries, support, partnerships, and general questions. We respond within 24 hours.",
  keywords: [
    // Short-keys
    "contact Wazelo",
    "Wazelo support",
    "Wazelo sales",
    "WhatsApp CRM demo",
    "WhatsApp CRM trial",
    "WA CRM contact",
    // Long-tail
    "contact Wazelo CRM",
    "WhatsApp CRM support India",
    "Wazelo CRM sales enquiry",
    "WhatsApp CRM demo request India",
    "Wazelo customer support India",
    "WhatsApp CRM free demo India",
    "talk to Wazelo CRM sales",
    "WhatsApp CRM onboarding India",
  ],
  alternates: {
    canonical: "https://wazelo.in/contact",
  },
  openGraph: {
    title: "Contact Wazelo CRM — Sales, Support & Partnerships",
    description:
      "Get in touch with the Wazelo CRM team. Sales, support, and partnerships. We respond within 24 hours.",
    url: "https://wazelo.in/contact",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Contact Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Wazelo CRM",
    description:
      "Sales, support, and partnership enquiries. We respond within 24 hours.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
