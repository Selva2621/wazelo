// Single source for every price and limit on the site: the homepage pricing section,
// the /pricing page and the Offer JSON-LD. INR numbers mirror backend/prisma/seed-plans.js
// (yearly = 10x monthly). USD is the price shown outside India; the backend still needs
// matching USD plans before it can charge in dollars.

export type Audience = "freelancer" | "team";
export type Currency = "INR" | "USD";

export interface Plan {
  slug: string;
  name: string;
  audience: Audience;
  /** Monthly price per currency. Yearly is always 10x (2 months free). */
  price: Record<Currency, number>;
  users: number;
  numbers: number;
  messages: number;
  campaigns: number;
  aiCredits: number;
  templates: number;
  apiCalls: number;
  shopifyStores: number;
  support?: string;
  /** One line under the name: who it is for. */
  tagline: string;
  /** Short card list. The first item may be "Everything in X". */
  features: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    slug: "solo",
    name: "Solo",
    audience: "freelancer",
    price: { INR: 299, USD: 9 },
    users: 1,
    numbers: 1,
    messages: 3000,
    campaigns: 10,
    aiCredits: 200,
    templates: 10,
    apiCalls: 100,
    shopifyStores: 0,
    tagline: "For a freelancer finding and closing clients.",
    features: ["Lead finder and client pipeline", "Proposals and follow-up sequences", "26 freelancer templates", "10 campaigns a month", "200 AI credits a month"],
  },
  {
    slug: "solo-pro",
    name: "Solo Pro",
    audience: "freelancer",
    price: { INR: 599, USD: 15 },
    users: 1,
    numbers: 1,
    messages: 10000,
    campaigns: 20,
    aiCredits: 500,
    templates: 25,
    apiCalls: 100,
    shopifyStores: 1,
    tagline: "For a busy freelancer sending more each month.",
    features: ["Everything in Solo", "10,000 messages a month", "20 campaigns a month", "500 AI credits a month", "1 Shopify store"],
  },
  {
    slug: "starter",
    name: "Starter",
    audience: "team",
    price: { INR: 499, USD: 19 },
    users: 5,
    numbers: 5,
    messages: 5000,
    campaigns: 10,
    aiCredits: 300,
    templates: 25,
    apiCalls: 1000,
    shopifyStores: 1,
    support: "Email",
    tagline: "For a small team sharing one inbox.",
    features: ["Shared inbox and assignments", "Automation and sequences", "10 campaigns a month", "300 AI credits a month", "Email support"],
  },
  {
    slug: "growth",
    name: "Growth",
    audience: "team",
    price: { INR: 999, USD: 39 },
    users: 15,
    numbers: 15,
    messages: 25000,
    campaigns: 50,
    aiCredits: 1000,
    templates: 50,
    apiCalls: 10000,
    shopifyStores: 1,
    support: "Priority",
    tagline: "For a sales team with steady lead flow.",
    features: ["Everything in Starter", "50 campaigns a month", "1,000 AI credits a month", "10,000 API calls a month", "Priority support"],
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    audience: "team",
    price: { INR: 1999, USD: 79 },
    users: 50,
    numbers: 50,
    messages: 100000,
    campaigns: 200,
    aiCredits: 2500,
    templates: 200,
    apiCalls: 50000,
    shopifyStores: 1,
    support: "Dedicated account manager",
    tagline: "For several teams or brands on many numbers.",
    features: ["Everything in Growth", "200 campaigns a month", "2,500 AI credits a month", "50,000 API calls a month", "Dedicated account manager"],
  },
];

/** Enterprise is sold through sales; 0 in the backend means unlimited. */
export const ENTERPRISE = { price: { INR: 3999, USD: 149 } as Record<Currency, number>, users: 200, numbers: 200, aiCredits: 5000 };

/** What each free trial includes (backend free-trial / free-trial-solo plans). */
export const TRIAL: Record<Audience, { users: number; numbers: number; messages: number }> = {
  freelancer: { users: 1, numbers: 1, messages: 500 },
  team: { users: 3, numbers: 2, messages: 1000 },
};

export const plansFor = (a: Audience) => PLANS.filter((p) => p.audience === a);
export const planBySlug = (slug: string) => PLANS.find((p) => p.slug === slug)!;

/** Monthly, or yearly at 10x. */
export const priceOf = (monthly: Record<Currency, number>, c: Currency, yearly = false) => monthly[c] * (yearly ? 10 : 1);

/** "₹1,999" in Indian grouping, "$79" in US grouping. */
export const money = (n: number, c: Currency) => (c === "INR" ? `₹${n.toLocaleString("en-IN")}` : `$${n.toLocaleString("en-US")}`);

/** Counts follow the visitor's convention: 1,00,000 in India, 100,000 elsewhere. */
export const num = (n: number, c: Currency = "USD") => n.toLocaleString(c === "INR" ? "en-IN" : "en-US");

/** "$9 a month (₹299 in India)": for static text such as FAQ answers and meta descriptions. */
export const bothPrices = (monthly: Record<Currency, number>) => `${money(monthly.USD, "USD")} (${money(monthly.INR, "INR")} in India)`;
