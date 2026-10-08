import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
import LenisProvider from "./lenis-provider";

// ── Structured Data Schemas ────────────────────────────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wazelo CRM",
  url: "https://wazelo.in",
  logo: {
    "@type": "ImageObject",
    url: "https://wazelo.in/logo/logo.png",
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

const plan = (name: string, price: string, description: string) => ({
  "@type": "Offer",
  name,
  description,
  price,
  priceCurrency: "INR",
  priceSpecification: {
    "@type": "UnitPriceSpecification",
    price,
    priceCurrency: "INR",
    unitText: "MONTH",
  },
  eligibleRegion: { "@type": "Country", name: "India" },
});

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wazelo CRM",
  alternateName: "Wazelo WhatsApp CRM",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM Software",
  operatingSystem: "Web",
  url: "https://wazelo.in",
  description:
    "Wazelo CRM is a WhatsApp CRM for freelancers and teams in India. Connect your WhatsApp number by scanning a QR code, then use a shared inbox, lead scraper, campaigns, drip sequences, automation rules, and an AI chatbot builder.",
  featureList: [
    "Connect WhatsApp by scanning a QR code",
    "Shared WhatsApp inbox with assignment, labels, and quick replies",
    "Lead scraper for Google Maps, Upwork, Freelancer.in, Truelancer, and LinkedIn Jobs",
    "Lead pipeline kanban",
    "WhatsApp campaigns with per-recipient delivery and read status",
    "Drip sequences that stop when the contact replies",
    "Automation rules",
    "AI chatbot and no-code flow builder",
    "AI reply suggestions and conversation summaries",
    "Contacts with tags, custom fields, and CSV import",
    "CSAT surveys",
    "Analytics dashboard",
    "Developer API and webhooks",
  ],
  screenshot: "https://wazelo.in/screens/01-inbox-shared-team.jpeg",
  offers: [
    plan("Solo Plan", "299", "1 user, 1 WhatsApp number, 3,000 messages/month, 5 campaigns/month, 20 templates."),
    plan("Starter Plan", "499", "5 users, 5 WhatsApp numbers, 5,000 messages/month, 10 campaigns/month, 50 AI credits, 1,000 API calls, 1 Shopify store."),
    plan("Growth Plan", "999", "15 users, 15 WhatsApp numbers, 25,000 messages/month, 50 campaigns/month, 200 AI credits, 10,000 API calls, 3 Shopify stores. Includes automation rules."),
    plan("Pro Plan", "1999", "50 users, 50 WhatsApp numbers, 1,00,000 messages/month, 200 campaigns/month, 500 AI credits, API access, 5 Shopify stores. Includes automation rules."),
    plan("Enterprise Plan", "3999", "200 users, 200 WhatsApp numbers, unlimited messages and campaigns, custom AI credits, API access, unlimited Shopify stores. Includes automation rules."),
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
        text: "Wazelo CRM is a WhatsApp CRM for freelancers and teams in India. It includes a shared team inbox, a lead scraper, a lead pipeline, WhatsApp campaigns, drip sequences, automation rules, an AI chatbot builder, contacts, and analytics.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Wazelo CRM cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Solo plan is ₹299/month (1 user, 1 WhatsApp number, 3,000 messages/month). The Starter plan is ₹499/month (5 users, 5 numbers, 5,000 messages/month). Growth is ₹999/month, Pro is ₹1,999/month, and Enterprise is ₹3,999/month. Yearly billing costs 10 times the monthly price. Every account starts with a 14-day free trial and no card is required.",
      },
    },
    {
      "@type": "Question",
      name: "How do I connect my WhatsApp number to Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You connect by scanning a QR code. In Wazelo, click Connect WhatsApp. On your phone, open WhatsApp, go to Settings, Linked Devices, tap Link a Device, and scan the QR code. The session reconnects on its own after short drops, so you do not need to rescan.",
      },
    },
    {
      "@type": "Question",
      name: "Can I send bulk WhatsApp messages with Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Campaigns send text, image, video, document, audio, or template messages to an audience you pick by lead status, tags, source, products, owner, team, or scraper run. You can schedule them with a timezone, pause, resume, or cancel them, and see Sent, Delivered, Read, or Failed for each recipient. Messages go out in batches with rate limits.",
      },
    },
    {
      "@type": "Question",
      name: "Can multiple team members work from one shared inbox?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The shared inbox has All, Unread, and Mine tabs. You can assign chats, add labels, close, reopen, or archive them, and use quick replies by typing \"/\". Each user connects one WhatsApp number, and your plan sets how many numbers your organisation can connect.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every account gets a 14-day free trial with no card required. The trial includes 3 users, 3 WhatsApp numbers, 1,000 messages, 5 campaigns, and 50 AI credits.",
      },
    },
    {
      "@type": "Question",
      name: "Does Wazelo CRM work for freelancers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Solo plan at ₹299/month includes a lead scraper for Google Maps, Upwork Jobs, Freelancer.in, Truelancer, and LinkedIn Jobs (up to 200 results per run), a lead pipeline, 20 message templates, and drip sequences that stop when a lead replies.",
      },
    },
    {
      "@type": "Question",
      name: "How does WhatsApp automation work in Wazelo CRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Automation rules run when something happens, such as a message received, a contact created, a status change, a time-based schedule, no reply, a Meta lead ad, or a Shopify order or abandoned cart. Rules can send a message, assign the chat, add a tag, or update the lead status. You can draft rules with AI and check execution logs. Automation is included from the Growth plan.",
      },
    },
    {
      "@type": "Question",
      name: "How does Wazelo CRM protect my data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each organisation's data is kept separate from other customers. Admins control access with Admin, Manager, and Employee roles and editable permissions, and audit logs record user actions. GDPR tools let you record consent, export a contact's data, or erase it.",
      },
    },
  ],
};

// ── Root Metadata ──────────────────────────────────────────────────────────────

const DEFAULT_TITLE = "Wazelo CRM | WhatsApp CRM for Freelancers and Teams";

export const metadata: Metadata = {
  metadataBase: new URL("https://wazelo.in"),
  title: {
    template: "%s | Wazelo CRM",
    default: DEFAULT_TITLE,
  },
  description:
    "WhatsApp CRM for freelancers and teams in India. Connect by scanning a QR code. Shared inbox, lead scraper, campaigns, sequences, automation, and AI chatbot. From ₹299/mo solo, ₹499/mo for teams. 14-day free trial.",
  keywords: [
    // ── Primary high-intent ──────────────────────────────────────────────────
    "WhatsApp CRM",
    "WhatsApp CRM India",
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
    "WhatsApp CRM for freelancers",

    // ── Feature short-keys ───────────────────────────────────────────────────
    "shared WhatsApp inbox",
    "WhatsApp bulk messaging software",
    "WhatsApp marketing automation",
    "WhatsApp chatbot builder",
    "WhatsApp AI chatbot",
    "WhatsApp automation platform",
    "WhatsApp campaign tool",
    "WhatsApp team inbox",
    "WhatsApp lead management",
    "WhatsApp lead scraper",
    "Google Maps lead scraper",
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
    "WhatsApp CSAT survey",
    "WhatsApp analytics tool",
    "WhatsApp reporting dashboard",

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

    // ── Developer ────────────────────────────────────────────────────────────
    "WhatsApp CRM API",
    "WhatsApp CRM webhooks",

    // ── Commercial intent ────────────────────────────────────────────────────
    "bulk WhatsApp messages India",
    "WhatsApp customer management system",
    "WhatsApp sales automation India",
    "affordable WhatsApp CRM India",
    "WhatsApp CRM SME India",
    "free WhatsApp CRM trial India",
    "WhatsApp CRM pricing India",
    "WhatsApp CRM free trial",
    "WhatsApp CRM demo",
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
    title: DEFAULT_TITLE,
    description:
      "Scan a QR code to connect WhatsApp. Shared inbox, lead scraper, campaigns, sequences, automation, and AI chatbot. From ₹299/mo. 14-day free trial, no card.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Wazelo CRM, the WhatsApp CRM for freelancers and teams",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@wazelocrm",
    creator: "@wazelocrm",
    title: DEFAULT_TITLE,
    description:
      "Scan a QR code to connect WhatsApp. Shared inbox, lead scraper, campaigns, sequences, automation, and AI chatbot. From ₹299/mo. 14-day free trial.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/logo/logo.png", sizes: "any" }],
    apple: [{ url: "/logo/logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/logo/logo.png",
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
    <html lang="en" data-theme="light" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint (no flash). Light is the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("wazelo-theme");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}`,
          }}
        />
        {/* Icon font for the older inner pages; text fonts are self-hosted via next/font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap"
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
      <body className="font-sans">
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
