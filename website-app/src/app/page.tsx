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
import { PLANS as PRICING_PLANS, bothPrices, num, planBySlug, type Currency } from "@/components/pricing/plans";
import { ORG_ID, SITE_URL, SOFTWARE_ID, pageMetadata, webPageJsonLd } from "@/lib/seo";

const TITLE = "WhatsApp CRM & Lead Follow-up Platform | Wazelo";
const DESCRIPTION =
  `Wazelo catches leads from Meta ads, your website and WhatsApp, replies in seconds with AI and follows up until they buy. From ${bothPrices(planBySlug("solo").price)} a month.`;

export const metadata = pageMetadata({ path: "/", title: TITLE, description: DESCRIPTION, absoluteTitle: true });

// Prices come from components/pricing/plans.ts. INR offers are for India, USD for everyone else.
const CURRENCIES: Currency[] = ["USD", "INR"];
const OFFERS = CURRENCIES.flatMap((c) =>
  PRICING_PLANS.map((p) => ({
    "@type": "Offer",
    name: `${p.name} plan`,
    description: `${p.users} ${p.users === 1 ? "user" : "users"}, ${p.numbers} WhatsApp ${p.numbers === 1 ? "number" : "numbers"}, ${num(p.messages)} messages a month. ${p.tagline}`,
    price: String(p.price[c]),
    priceCurrency: c,
    priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.price[c]), priceCurrency: c, billingDuration: "P1M", unitText: "MONTH" },
    ...(c === "INR" ? { eligibleRegion: { "@type": "Country", name: "India" } } : {}),
    url: `${SITE_URL}/pricing`,
  })),
);

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
    "Lead finder for Google Maps and business directories",
    "Shared inbox for WhatsApp, Instagram, Messenger and email",
    "Follow-up sequences and automation",
    "Campaigns on official WhatsApp Cloud API numbers",
    "Proposals, deals pipeline and lead scoring",
    "Installable mobile app with push notifications",
    "REST API, webhooks and MCP server",
  ],
  offers: OFFERS,
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
