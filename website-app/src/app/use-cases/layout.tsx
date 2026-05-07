import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp CRM Use Cases — Real Estate, E-commerce, Healthcare & More",
  description:
    "See how real estate, e-commerce, healthcare, education, and finance businesses use Wazelo CRM to close more deals on WhatsApp. Industry-specific WhatsApp CRM use cases for India.",
  keywords: [
    // Short-keys
    "WhatsApp use cases",
    "WhatsApp for business India",
    "WhatsApp business examples",
    "WhatsApp sales use case",
    "WhatsApp support use case",
    "WA business use cases",
    // Industry long-tail
    "WhatsApp CRM use cases India",
    "WhatsApp CRM for real estate India",
    "WhatsApp CRM for e-commerce India",
    "WhatsApp CRM healthcare India",
    "WhatsApp CRM education India",
    "WhatsApp CRM finance India",
    "WhatsApp business use cases India",
    "WhatsApp CRM for hotels India",
    "WhatsApp CRM for restaurants India",
    "WhatsApp CRM for retail India",
    "WhatsApp CRM for travel India",
    "WhatsApp CRM for insurance India",
    "WhatsApp CRM for loans India",
    "WhatsApp customer communication use cases",
    "WhatsApp for lead generation India",
    "WhatsApp for customer support India",
    "WhatsApp for appointment booking India",
    "WhatsApp for order tracking India",
    "WhatsApp for abandoned cart recovery India",
    "WhatsApp for student admissions India",
  ],
  alternates: {
    canonical: "https://wazelo.in/use-cases",
  },
  openGraph: {
    title: "WhatsApp CRM Use Cases — Real Estate, E-commerce, Healthcare | Wazelo CRM",
    description:
      "How real estate, e-commerce, healthcare, education, and finance businesses use Wazelo CRM to close more deals on WhatsApp.",
    url: "https://wazelo.in/use-cases",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WhatsApp CRM Use Cases — Wazelo CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp CRM Use Cases | Wazelo CRM",
    description:
      "Real estate, e-commerce, healthcare, education — how Indian businesses use Wazelo WhatsApp CRM.",
    images: ["/opengraph-image"],
  },
};

export default function UseCasesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
