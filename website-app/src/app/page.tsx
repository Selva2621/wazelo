import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StoryHero } from "@/components/story/story-hero";
import { StoryChapters } from "@/components/story/story-chapters";
import { PaidBand, People, FeatureList, StoryCta } from "@/components/story/story-sections";
import { Integrations } from "@/components/home/integrations";
import { Pricing } from "@/components/home/pricing";
import { Faq } from "@/components/home/faq";
import { FAQ } from "@/components/home/faq-data";
import { JsonLd } from "@/components/json-ld";
import { ORG_ID, SITE_URL, SOFTWARE_ID, pageMetadata, webPageJsonLd } from "@/lib/seo";

const TITLE = "WhatsApp CRM & Lead Follow-up Platform | Wazelo";
const DESCRIPTION =
  "Wazelo catches leads from Meta ads, your website and WhatsApp, replies in seconds with AI and follows up until they buy. From ₹299/month, 14-day free trial.";

export const metadata = pageMetadata({ path: "/", title: TITLE, description: DESCRIPTION, absoluteTitle: true });

// Prices mirror components/home/pricing.tsx (backend seed-plans). Keep in sync.
const PLANS = [
  { name: "Solo", price: 299, description: "1 user, 1 WhatsApp number, 3,000 messages a month. Lead finder, client pipeline, follow-up sequences." },
  { name: "Starter", price: 499, description: "5 users, 5 WhatsApp numbers, 5,000 messages a month. Shared inbox, 10 campaigns a month, 50 AI credits." },
  { name: "Growth", price: 999, description: "15 users, 15 WhatsApp numbers, 25,000 messages a month. Automation workflows, 50 campaigns a month, priority support." },
  { name: "Pro", price: 1999, description: "50 users, 50 WhatsApp numbers, 1,00,000 messages a month. Full API access, 200 campaigns a month, dedicated account manager." },
];

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": SOFTWARE_ID,
  name: "Wazelo",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM",
  operatingSystem: "Web, Android, iOS",
  url: SITE_URL,
  description: DESCRIPTION,
  publisher: { "@id": ORG_ID },
  screenshot: `${SITE_URL}/screens/01-inbox-shared-team.jpeg`,
  featureList: [
    "Meta lead ads with instant WhatsApp welcome",
    "AI assistant that answers from your knowledge base",
    "Website chat widget with human handover",
    "Lead finder for Google Maps and IndiaMART",
    "Shared inbox for WhatsApp, Instagram, Messenger and email",
    "Follow-up sequences and automation",
    "Campaigns on official WhatsApp Cloud API numbers",
    "Proposals, deals pipeline and lead scoring",
    "Installable mobile app with push notifications",
    "REST API, webhooks and MCP server",
  ],
  offers: PLANS.map((p) => ({
    "@type": "Offer",
    name: `${p.name} plan`,
    description: p.description,
    price: String(p.price),
    priceCurrency: "INR",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: String(p.price),
      priceCurrency: "INR",
      billingDuration: "P1M",
      unitText: "MONTH",
    },
    eligibleRegion: { "@type": "Country", name: "India" },
    url: `${SITE_URL}/#pricing`,
  })),
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface font-sans text-on-surface">
      <JsonLd data={[webPageJsonLd({ path: "/", title: TITLE, description: DESCRIPTION }), softwareApplication, faqPage]} />
      <Navbar />
      <main>
        <StoryHero />
        <Integrations />
        <StoryChapters />
        <PaidBand />
        <People />
        <FeatureList />
        <Pricing />
        <Faq />
        <StoryCta />
      </main>
      <Footer showCta={false} />
    </div>
  );
}
