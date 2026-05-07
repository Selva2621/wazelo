import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PropEdge Realty Case Study — 3x Lead Conversion with WhatsApp CRM",
  description:
    "How PropEdge Realty achieved 3x lead conversion in 30 days, 87% faster response times, and ₹24L attributed revenue using Wazelo CRM's WhatsApp CRM for real estate.",
  keywords: [
    "WhatsApp CRM real estate India",
    "real estate WhatsApp lead management",
    "property lead conversion WhatsApp",
    "WhatsApp CRM case study India",
    "real estate CRM WhatsApp",
  ],
  alternates: {
    canonical: "https://wazelo.in/case-study/propedge-realty",
  },
  openGraph: {
    title: "PropEdge Realty: 3x Lead Conversion in 30 Days with Wazelo CRM",
    description:
      "How PropEdge Realty achieved 3x lead conversion, 87% faster response times, and ₹24L attributed revenue using WhatsApp CRM.",
    url: "https://wazelo.in/case-study/propedge-realty",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PropEdge Realty WhatsApp CRM Case Study — Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PropEdge Realty: 3x Lead Conversion with Wazelo WhatsApp CRM",
    description:
      "87% faster response times, 340% more leads responded, ₹24L revenue in 30 days with Wazelo CRM.",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
