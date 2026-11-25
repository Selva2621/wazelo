import PricingClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { ENTERPRISE, PLANS, bothPrices, num, planBySlug, type Currency } from "@/components/pricing/plans";
import { PRICING_FAQ } from "@/components/pricing/pricing-faq";
import { SITE_URL, SOFTWARE_ID, breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/pricing",
  title: "WhatsApp CRM Pricing: Plans for Freelancers & Teams",
  description: `Wazelo plans for freelancers from ${bothPrices(planBySlug("solo").price)} and teams from ${bothPrices(planBySlug("starter").price)} a month. 14-day free trial, no card.`,
};

export const metadata = pageMetadata(seo);

// INR offers are for India; USD offers for everywhere else.
const region = (c: Currency) => (c === "INR" ? { eligibleRegion: { "@type": "Country", name: "India" } } : {});
const CURRENCIES: Currency[] = ["USD", "INR"];

const offers = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Wazelo",
  url: `${SITE_URL}/pricing`,
  isRelatedTo: { "@id": SOFTWARE_ID },
  offers: CURRENCIES.flatMap((c) => [
    ...PLANS.map((p) => ({
      "@type": "Offer",
      name: `${p.name} plan`,
      description: `${p.users} ${p.users === 1 ? "user" : "users"}, ${p.numbers} WhatsApp ${p.numbers === 1 ? "number" : "numbers"}, ${num(p.messages)} messages a month.`,
      price: String(p.price[c]),
      priceCurrency: c,
      priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.price[c]), priceCurrency: c, billingDuration: "P1M", unitText: "MONTH" },
      ...region(c),
      url: `${SITE_URL}/pricing`,
    })),
    {
      "@type": "Offer",
      name: "Enterprise plan",
      description: `${ENTERPRISE.users} users, ${ENTERPRISE.numbers} WhatsApp numbers, unlimited messages.`,
      priceCurrency: c,
      priceSpecification: { "@type": "UnitPriceSpecification", minPrice: String(ENTERPRISE.price[c]), priceCurrency: c, billingDuration: "P1M", unitText: "MONTH" },
      ...region(c),
      url: `${SITE_URL}/contact`,
    },
  ]),
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Pricing", path: seo.path }]), offers, faqPage]} />
      <PricingClient />
    </>
  );
}
