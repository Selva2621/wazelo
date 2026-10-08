import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security and Data Protection",
  description:
    "How Wazelo CRM protects your data. Separate data for each organisation, Admin, Manager, and Employee roles with editable permissions, audit logs, and GDPR tools for consent, export, and erasure.",
  keywords: [
    // Short-keys
    "WhatsApp CRM security",
    "WhatsApp data security",
    "WhatsApp GDPR",
    "secure WhatsApp CRM",
    "WA data protection",
    // Long-tail
    "WhatsApp data protection India",
    "WhatsApp CRM data security India",
    "WhatsApp GDPR compliance India",
    "secure WhatsApp CRM India",
    "WhatsApp CRM audit log India",
    "WhatsApp CRM access control India",
    "WhatsApp CRM role based access",
  ],
  alternates: {
    canonical: "https://wazelo.in/security",
  },
  openGraph: {
    title: "Security and Data Protection | Wazelo CRM",
    description:
      "Separate data for each organisation, role-based permissions, audit logs, and GDPR tools for your WhatsApp CRM data.",
    url: "https://wazelo.in/security",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Wazelo CRM Security",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security | Wazelo CRM",
    description:
      "Separate data for each organisation, role-based permissions, audit logs, and GDPR tools.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
