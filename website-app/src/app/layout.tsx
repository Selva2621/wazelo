import type { Metadata } from "next";
import "./globals.css";
import LenisProvider from "./lenis-provider";

// ── Structured Data Schemas ────────────────────────────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wazelo CRM",
  url: "https://wazelo.in",
  logo: {
    "@type": "ImageObject",
    url: "https://wazelo.in/logo/logo.jpeg",
    width: 180,
    height: 180,
  },
  sameAs: [] as string[],
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: "hello@wazelo.in",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    {
      "@type": "ContactPoint",
      email: "sales@wazelo.in",
      contactType: "sales",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wazelo CRM",
  alternateName: "Wazelo WhatsApp CRM",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM Software",
  operatingSystem: "Web, Android, iOS",
  url: "https://wazelo.in",
  description:
    "Wazelo CRM is the best WhatsApp CRM for Indian businesses. Shared team inbox, bulk campaign broadcasts, no-code automation workflows, AI chatbot builder, analytics dashboard, and contacts management — all in one platform.",
  featureList: [
    "Shared WhatsApp inbox for teams",
    "Bulk WhatsApp campaign broadcasting",
    "No-code automation workflows",
    "AI-powered WhatsApp chatbot builder",
    "WhatsApp analytics dashboard",
    "Contacts CRM with tagging and segmentation",
    "WhatsApp Business API integration",
    "Multi-agent support",
    "Real-time delivery tracking",
    "CSAT surveys",
    "Lead scoring",
    "API access",
  ],
  screenshot: "https://wazelo.in/screens/01-inbox-shared-team.jpeg",
  offers: [
    {
      "@type": "Offer",
      name: "Starter Plan",
      description: "5 users, 5 WhatsApp sessions, 5,000 messages/month, 10 campaigns. Shared inbox, bulk campaigns, basic CRM, email support.",
      price: "499",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "499",
        priceCurrency: "INR",
        unitText: "MONTH",
      },
      eligibleRegion: { "@type": "Country", name: "India" },
    },
    {
      "@type": "Offer",
      name: "Growth Plan",
      description: "15 users, 15 WhatsApp sessions, 25,000 messages/month, 50 campaigns. Everything in Starter plus automation workflows, advanced analytics, priority support.",
      price: "999",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "999",
        priceCurrency: "INR",
        unitText: "MONTH",
      },
      eligibleRegion: { "@type": "Country", name: "India" },
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      description: "50 users, 50 WhatsApp sessions, 1,00,000 messages/month, 200 campaigns. Full API access, dedicated account manager, 24/7 phone support.",
      price: "1999",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "1999",
        priceCurrency: "INR",
        unitText: "MONTH",
      },
      eligibleRegion: { "@type": "Country", name: "India" },
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "127",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: "Rajesh M.",
        jobTitle: "Head of Sales",
        worksFor: { "@type": "Organization", name: "PropEdge Realty" },
      },
      reviewBody:
        "We went from missing 40% of leads to a 94% response rate in 3 weeks. Wazelo CRM is the only tool that actually works for WhatsApp sales.",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wazelo CRM is the best WhatsApp CRM software for Indian businesses. It provides a shared team inbox, bulk WhatsApp campaign broadcasting, no-code automation workflows, AI chatbot builder, analytics dashboard, and contacts management — all in one platform. Trusted by 500+ growing businesses across real estate, e-commerce, healthcare, and education.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Wazelo CRM cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wazelo CRM pricing starts at ₹499/month for the Starter plan (5 users, 5 WhatsApp sessions, 5,000 messages/month). The Growth plan is ₹999/month and the Pro plan is ₹1,999/month. Enterprise plans with custom limits are available from ₹3,999/month. All plans include a 14-day free trial with no credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "Does Wazelo CRM work with WhatsApp Business API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Wazelo CRM is built on the WhatsApp Business API (Meta BSP). It supports multiple WhatsApp sessions, official message templates, and all Meta compliance requirements. Unlike the free WhatsApp Business App, the API enables unlimited team access, bulk messaging, automation, and chatbots.",
      },
    },
    {
      "@type": "Question",
      name: "Can I send bulk WhatsApp messages with Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Bulk Campaigns feature lets you broadcast personalised WhatsApp messages to thousands of contacts at once. You get real-time delivery tracking, smart retry logic, and detailed analytics. The Growth plan includes 25,000 messages/month and the Pro plan includes 1,00,000 messages/month.",
      },
    },
    {
      "@type": "Question",
      name: "Is Wazelo CRM better than Interakt, Wati, or AiSensy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wazelo CRM offers a complete WhatsApp CRM suite purpose-built for Indian SMEs — combining shared inbox, campaigns, automation, chatbot, and analytics in one affordable platform starting at ₹499/month. Compared to Interakt, Wati, and AiSensy, Wazelo CRM provides more features per rupee with India-first pricing and dedicated support.",
      },
    },
    {
      "@type": "Question",
      name: "Can multiple team members use the same WhatsApp number?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Wazelo CRM's shared WhatsApp inbox lets your entire team collaborate on the same WhatsApp number simultaneously. Conversations can be assigned to specific agents, tracked to resolution, and monitored with real-time analytics. The Starter plan supports 5 users and 5 WhatsApp sessions.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, all Wazelo CRM plans include a 14-day free trial. No credit card is required to get started. You can access all features of your chosen plan during the trial period.",
      },
    },
    {
      "@type": "Question",
      name: "Which industries can use Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wazelo CRM works for any business that uses WhatsApp for customer communication. It is especially popular in real estate (lead management), e-commerce (order updates, abandoned cart recovery), healthcare (appointment reminders), education (student communication, admissions), and financial services (loan applications, policy renewals) across India.",
      },
    },
    {
      "@type": "Question",
      name: "How does WhatsApp automation work in Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wazelo CRM's no-code automation builder lets you create WhatsApp workflow rules without any coding. You can set up auto-replies, lead routing based on keywords or time, drip message sequences, follow-up flows, and chatbot triggers. Automations run 24/7 and can be combined with the chatbot builder for complete self-service experiences.",
      },
    },
    {
      "@type": "Question",
      name: "Is Wazelo CRM safe and secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Wazelo CRM is built on Meta's official WhatsApp Business API infrastructure with end-to-end encryption. All data is stored with enterprise-grade security, role-based access controls, and audit logs. Wazelo CRM is fully compliant with Meta BSP requirements and data protection regulations applicable in India.",
      },
    },
  ],
};

// ── Root Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL("https://wazelo.in"),
  title: {
    template: "%s | Wazelo CRM",
    default: "Wazelo CRM — Best WhatsApp CRM for Indian Businesses",
  },
  description:
    "Wazelo CRM: Best WhatsApp CRM for Indian businesses. Shared team inbox, bulk campaigns, no-code automation, AI chatbot & analytics. Starts ₹499/mo. 14-day free trial.",
  keywords: [
    // ── Primary high-intent ──────────────────────────────────────────────────
    "WhatsApp CRM",
    "WhatsApp CRM India",
    "best WhatsApp CRM for Indian businesses",
    "WhatsApp CRM software",
    "WhatsApp business CRM",
    "WhatsApp CRM tool",
    "WA CRM",
    "WA CRM India",
    "WhatsApp CRM app",
    "WhatsApp CRM platform",
    "WhatsApp CRM system",
    "WhatsApp CRM solution",
    "WhatsApp customer relationship management",

    // ── Feature short-keys ───────────────────────────────────────────────────
    "shared WhatsApp inbox",
    "WhatsApp bulk messaging software",
    "WhatsApp marketing automation",
    "WhatsApp chatbot builder",
    "WhatsApp automation platform",
    "WhatsApp campaign tool",
    "WhatsApp team inbox",
    "WhatsApp lead management",
    "WhatsApp broadcast tool",
    "WhatsApp multi agent",
    "WhatsApp shared inbox",
    "WhatsApp bot builder",
    "WhatsApp drip campaign",
    "WhatsApp sequence messages",
    "WhatsApp auto reply",
    "WhatsApp message scheduling",
    "WhatsApp contact management",
    "WhatsApp lead generation",
    "WhatsApp sales tool",
    "WhatsApp support tool",
    "WhatsApp business inbox",
    "WhatsApp API platform",
    "WhatsApp CSAT survey",
    "WhatsApp analytics tool",
    "WhatsApp reporting dashboard",

    // ── Competitor / alternative short-keys ──────────────────────────────────
    "Interakt alternative",
    "Wati alternative",
    "AiSensy alternative",
    "Gallabox alternative",
    "Respond io alternative",
    "Zoko alternative",
    "Freshchat WhatsApp alternative",
    "Trengo alternative",
    "best Interakt alternative India",
    "best Wati alternative India",
    "WhatsApp CRM vs Wati",
    "WhatsApp CRM vs Interakt",
    "WhatsApp CRM vs AiSensy",

    // ── Industry long-tail ───────────────────────────────────────────────────
    "WhatsApp CRM for real estate India",
    "WhatsApp CRM for e-commerce India",
    "WhatsApp CRM for healthcare India",
    "WhatsApp CRM for education India",
    "WhatsApp CRM for finance India",
    "WhatsApp CRM for hotels India",
    "WhatsApp CRM for retail India",
    "WhatsApp CRM for D2C brands India",
    "WhatsApp CRM for startups India",
    "WhatsApp CRM for SME India",
    "WhatsApp CRM for small business India",
    "WhatsApp CRM for agencies India",

    // ── Technical / API ──────────────────────────────────────────────────────
    "WhatsApp business API CRM India",
    "WhatsApp business API provider India",
    "Meta BSP WhatsApp India",
    "WhatsApp API integration India",

    // ── Commercial intent ────────────────────────────────────────────────────
    "bulk WhatsApp messages India",
    "WhatsApp customer management system",
    "WhatsApp sales automation India",
    "affordable WhatsApp CRM India",
    "WhatsApp CRM SME India",
    "free WhatsApp CRM trial India",
    "WhatsApp CRM pricing India",
    "cheap WhatsApp CRM India",
    "WhatsApp CRM free trial",
    "WhatsApp CRM demo",
    "best WhatsApp tool for business India",
    "top WhatsApp CRM 2025",
    "WhatsApp business software India",
    "WhatsApp business management software",
    "WhatsApp sales management India",
  ],
  alternates: {
    canonical: "https://wazelo.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://wazelo.in",
    siteName: "Wazelo CRM",
    title: "Wazelo CRM — Best WhatsApp CRM for Indian Businesses",
    description:
      "Shared inbox, bulk campaigns, automation & chatbot for WhatsApp. Starts ₹499/mo. Trusted by 500+ Indian businesses. 14-day free trial.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Wazelo CRM — WhatsApp CRM dashboard for Indian businesses",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@wazelocrm",
    creator: "@wazelocrm",
    title: "Wazelo CRM — Best WhatsApp CRM for Indian Businesses",
    description:
      "Shared inbox, bulk campaigns, automation & chatbot for WhatsApp. Starts ₹499/mo. 14-day free trial.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

// ── Root Layout ────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800;900&family=Manrope:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
