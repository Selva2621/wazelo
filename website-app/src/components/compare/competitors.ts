// Facts for the /compare pages. Every competitor value comes from that company's own
// public page, checked on CHECKED_ON. "Not listed" means it isn't on their pricing page,
// not that they can't do it. Re-check the sources before changing a claim.
// Wazelo values must match components/pricing/plans.ts.

export const CHECKED_ON = "20 November 2026";

export interface CompareRow {
  label: string;
  them: string;
  us: string;
}

export interface Competitor {
  slug: string;
  name: string;
  /** Pages the figures were taken from. */
  sources: { label: string; url: string }[];
  /** How the competitor bills, for the price footnote. */
  billingNote: string;
  /** One-line summary for the hero and the hub card. */
  summary: string;
  rows: CompareRow[];
  /** A 15-person team's monthly subscription, before taxes and Meta's message charges. */
  teamOf15: { them: string; themMath: string; us: string; usMath: string };
  /** Honest cases where the competitor is the better pick. */
  chooseThem: string[];
  seoTitle: string;
  seoDescription: string;
}

const US = {
  entry: "₹499 a month for 5 users (Starter)",
  sequences: "Included in every plan",
  ai: "Included: 300 to 2,500 AI credits a month",
  chatbot: "Included in every team plan",
  widget: "Included in every team plan",
  pipeline: "Deals pipeline and proposals in every plan",
  leadAds: "Meta lead ads with a WhatsApp welcome in seconds",
  trial: "14 days, no card",
};

export const COMPETITORS: Competitor[] = [
  {
    slug: "wati",
    name: "Wati",
    sources: [{ label: "wati.io/pricing", url: "https://www.wati.io/pricing" }],
    billingNote: "Wati prices are per month, billed quarterly, as shown on its pricing page.",
    summary: "Both run on the official WhatsApp API. Wazelo adds follow-up sequences, a deals pipeline and proposals to every plan, from ₹499 a month.",
    rows: [
      { label: "Entry team plan", them: "Growth, ₹2,699 a month for 3 users, no extra users", us: US.entry },
      { label: "Extra users", them: "₹1,299 a user a month on Pro, ₹2,199 on Business", us: "Higher plans include more users: 15 on Growth, 50 on Pro" },
      { label: "Follow-up sequences", them: "Drip campaigns on Growth", us: US.sequences },
      { label: "AI replies", them: "AI agent and AI credits on every plan", us: US.ai },
      { label: "Chatbot builder", them: "On every plan", us: US.chatbot },
      { label: "Website chat", them: "Webchat in the Growth inbox", us: US.widget },
      { label: "Sales pipeline", them: "Pipeline management on Business (₹16,799 a month)", us: US.pipeline },
      { label: "Free trial", them: "7 days", us: US.trial },
    ],
    teamOf15: {
      them: "₹18,789",
      themMath: "Pro ₹5,799 with 5 users, plus 10 users at ₹1,299",
      us: "₹999",
      usMath: "Growth, 15 users included",
    },
    chooseThem: [
      "You need TikTok and several Instagram and Facebook accounts in one inbox (Business plan).",
      "You need Salesforce or HubSpot integrations built in.",
    ],
    seoTitle: "Wazelo vs Wati: A Wati Alternative for Lead Follow-up",
    seoDescription:
      "Compare Wazelo and Wati on price, users, follow-up sequences, AI replies and sales pipeline. A 15-person team pays ₹999 a month on Wazelo Growth.",
  },
  {
    slug: "interakt",
    name: "Interakt",
    sources: [{ label: "interakt.shop/pricing", url: "https://www.interakt.shop/pricing" }],
    billingNote: "Interakt prices are per month plus taxes, as shown on its pricing page.",
    summary: "Interakt splits marketing, sales CRM and AI agents into separate products. Wazelo includes all three in one plan, from ₹499 a month.",
    rows: [
      { label: "Entry team plan", them: "Growth, ₹2,799 a month, unlimited agents (WhatsApp and Instagram)", us: US.entry },
      { label: "Follow-up sequences", them: "Not listed on the pricing page (campaigns are)", us: US.sequences },
      { label: "AI replies", them: "AI Agents add-on at ₹3,000 a month on Growth and Advanced", us: US.ai },
      { label: "Chatbot builder", them: "Linear flows on Growth, branching flows on Advanced (₹3,799)", us: US.chatbot },
      { label: "Website chat", them: "Not listed on the pricing page", us: US.widget },
      { label: "Sales pipeline", them: "Separate Sales CRM plan, ₹2,499 a month for 5 sales agents", us: US.pipeline },
      { label: "Free trial", them: "Free trial, length not stated", us: US.trial },
    ],
    teamOf15: {
      them: "₹8,298",
      themMath: "Growth ₹2,799, plus AI Agents ₹3,000, plus Sales CRM ₹2,499 (5 sales agents)",
      us: "₹999",
      usMath: "Growth, 15 users, AI credits and pipeline included",
    },
    chooseThem: [
      "You have a large support team and want unlimited agents on one marketing plan.",
      "You run a Shopify store and want its ready-made abandoned-checkout and winback flows.",
    ],
    seoTitle: "Wazelo vs Interakt: An Interakt Alternative with AI and CRM Included",
    seoDescription:
      "Compare Wazelo and Interakt on price, AI replies, chatbot, follow-up and sales CRM. Wazelo includes AI credits and a deals pipeline from ₹499 a month.",
  },
  {
    slug: "aisensy",
    name: "AiSensy",
    sources: [
      { label: "aisensy.com/pricing (add-ons)", url: "https://aisensy.com/pricing" },
      { label: "AiSensy blog, Basic vs Pro", url: "https://m.aisensy.com/blog/aisensy-basic-vs-pro-plan-which-ones-best-for-you/" },
      { label: "AiSensy blog, July 2026 plan list", url: "https://m.aisensy.com/blog/aisensy-alternative/" },
    ],
    billingNote: "AiSensy plan prices are per month, from AiSensy's own blog. Its pricing page loads the plan cards in a way we could not read, so check it before buying.",
    summary: "AiSensy sells the chatbot builder and AI agent as paid add-ons. Wazelo includes the chatbot, AI credits and follow-up sequences in every team plan.",
    rows: [
      { label: "Entry team plan", them: "Basic, ₹1,500 a month, 1 owner and 5 agents", us: US.entry },
      { label: "Extra agents", them: "₹750 an agent a month", us: "Higher plans include more users: 15 on Growth, 50 on Pro" },
      { label: "Follow-up sequences", them: "Not listed (campaign scheduler on Pro)", us: US.sequences },
      { label: "AI replies", them: "AI Agent add-on, ₹1,350 a month for 1,000 AI messages", us: US.ai },
      { label: "Chatbot builder", them: "Add-on, ₹2,500 a month for 5 chatbots", us: US.chatbot },
      { label: "Sales pipeline", them: "Not listed", us: US.pipeline },
      { label: "Free plan or trial", them: "Free Forever plan and a 14-day trial", us: US.trial },
    ],
    teamOf15: {
      them: "₹14,550",
      themMath: "Pro ₹3,200 with 5 agents, plus 10 agents at ₹750, plus chatbot ₹2,500 and AI agent ₹1,350",
      us: "₹999",
      usMath: "Growth, 15 users, chatbot and AI credits included",
    },
    chooseThem: [
      "You only send broadcasts and want a free plan to start.",
      "You want Meta's message rates passed through with nothing added, as AiSensy states.",
    ],
    seoTitle: "Wazelo vs AiSensy: An AiSensy Alternative with Chatbot and AI Included",
    seoDescription:
      "Compare Wazelo and AiSensy on price, agents, chatbot, AI replies and follow-up. Wazelo includes the chatbot and AI credits in every team plan.",
  },
];

export const competitorBySlug = (slug: string) => COMPETITORS.find((c) => c.slug === slug);
