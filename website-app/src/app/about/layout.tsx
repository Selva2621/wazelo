import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Wazelo — WhatsApp CRM Built for India",
  description:
    "Learn how Wazelo CRM was built to help Indian businesses grow faster with WhatsApp-first customer relationship management. Our mission, team, and values.",
  keywords: [
    // Short-keys
    "Wazelo",
    "Wazelo CRM",
    "Wazelo about",
    "WhatsApp CRM company India",
    "WA CRM startup",
    // Long-tail
    "Wazelo CRM about",
    "WhatsApp CRM India company",
    "WhatsApp CRM startup India",
    "Wazelo team",
    "WhatsApp business software India",
    "Wazelo CRM founders",
    "WhatsApp CRM made in India",
    "Indian WhatsApp CRM company",
    "Wazelo CRM story",
    "WhatsApp CRM for Indian SMEs",
  ],
  alternates: {
    canonical: "https://wazelo.in/about",
  },
  openGraph: {
    title: "About Wazelo — WhatsApp CRM Built for India | Wazelo CRM",
    description:
      "Learn how Wazelo CRM was built to help Indian businesses close more deals on WhatsApp. Our mission, team, and story.",
    url: "https://wazelo.in/about",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "About Wazelo CRM — WhatsApp CRM for India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Wazelo — WhatsApp CRM Built for India",
    description:
      "How Wazelo CRM was built to help Indian businesses close more deals on WhatsApp.",
    images: ["/opengraph-image"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
