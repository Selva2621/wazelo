import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — Enterprise-Grade WhatsApp Data Protection",
  description:
    "How Wazelo CRM keeps your data safe. End-to-end encryption, Meta BSP compliance, SOC-2 aligned infrastructure, role-based access controls, and audit logs for WhatsApp CRM.",
  keywords: [
    // Short-keys
    "WhatsApp CRM security",
    "WhatsApp data security",
    "WhatsApp encryption",
    "WhatsApp compliance",
    "Meta BSP compliant",
    "WhatsApp GDPR",
    "secure WhatsApp CRM",
    "WA data protection",
    // Long-tail
    "WhatsApp data protection India",
    "WhatsApp business API compliance India",
    "Meta BSP compliant CRM India",
    "WhatsApp CRM data security India",
    "enterprise WhatsApp security India",
    "WhatsApp GDPR compliance India",
    "secure WhatsApp CRM India",
    "WhatsApp end to end encryption CRM",
    "WhatsApp CRM audit log India",
    "WhatsApp CRM access control India",
    "safe WhatsApp CRM India",
  ],
  alternates: {
    canonical: "https://wazelo.in/security",
  },
  openGraph: {
    title: "Security — Enterprise-Grade WhatsApp Data Protection | Wazelo CRM",
    description:
      "End-to-end encryption, Meta BSP compliance, SOC-2 aligned infrastructure, and role-based access controls for your WhatsApp CRM data.",
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
      "End-to-end encryption, Meta BSP compliance, SOC-2 aligned infrastructure for your WhatsApp CRM.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
