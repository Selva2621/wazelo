// Shared by the visible FAQ (faq.tsx) and the homepage FAQPage JSON-LD, so the
// structured data always matches what is on the page.
import { ENTERPRISE, bothPrices, planBySlug } from "@/components/pricing/plans";

const p = (slug: string) => bothPrices(planBySlug(slug).price);

export const FAQ = [
  {
    q: "I'm a freelancer. Do I need a team plan?",
    a: `No. Choose “Solo / Freelancer” at sign-up and take the Solo plan at ${p("solo")} a month. You get the lead finder, a client pipeline, proposals and follow-up sequences. You can switch to a team setup later in Settings.`,
  },
  {
    q: "What do teams get that freelancers don't?",
    a: "Team accounts add assignments and a My Team view, automation, the chatbot and chat widget, CSAT surveys, roles for Admin, Manager and Employee, audit logs and multiple WhatsApp numbers.",
  },
  {
    q: "Can it reply to my Facebook and Instagram ad leads?",
    a: "Yes. Meta lead ads arrive straight from Meta, not through a Google Sheet. Wazelo sends a WhatsApp welcome within seconds and starts the follow-up for you.",
  },
  {
    q: "Will the AI make things up?",
    a: "It answers from the knowledge base you give it. When it can’t find an answer, it hands the chat to your team and adds the question to a list for you to fill in.",
  },
  {
    q: "How much does it cost?",
    a: `Freelancer plans are Solo at ${p("solo")} and Solo Pro at ${p("solo-pro")} a month. Team plans are Starter at ${p("starter")}, Growth at ${p("growth")} and Pro at ${p("pro")} a month. Enterprise starts at ${bothPrices(ENTERPRISE.price)} a month. Every plan has a 14-day free trial with no credit card.`,
  },
  {
    q: "Does it use the official WhatsApp Business API?",
    a: "Yes. Connect official WhatsApp Cloud API numbers with approved templates and per-number send limits. You can also link a number by QR code.",
  },
  {
    q: "Can several people use the same WhatsApp number?",
    a: "Yes. The shared inbox lets your whole team work one number at the same time. Chats are assigned to agents, tracked to resolution and reported on.",
  },
  {
    q: "Can I send bulk WhatsApp messages?",
    a: "Yes. Campaigns send personalised template messages to your segments, with live delivery tracking. Growth includes 25,000 messages a month and Pro includes 1,00,000.",
  },
  {
    q: "How is Wazelo different from Interakt, Wati or AiSensy?",
    a: "Most tools help you send messages. Wazelo is built around follow-up: every lead is caught, answered, chased on a schedule and tracked to won or lost, with AI doing the first reply.",
  },
  {
    q: "Is my data secure?",
    a: "Wazelo runs on Meta's official API infrastructure, with role-based access, audit logs and GDPR tools for data requests.",
  },
];
