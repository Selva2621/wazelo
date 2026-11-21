// Pricing-page FAQ. Shared by the visible list and the FAQPage JSON-LD so they match.
// Every answer is backed by backend billing behaviour (seed-plans.js, change-plan and
// usage-tracking use cases). Don't add claims the backend doesn't do.
import { TRIAL, num } from "./plans";

export const PRICING_FAQ = [
  {
    q: "Do I need a card to start the free trial?",
    a: `No. Every plan starts with a 14-day free trial and no card. A team trial includes ${TRIAL.team.users} users, ${TRIAL.team.numbers} WhatsApp numbers and ${num(TRIAL.team.messages)} messages. A freelancer trial includes ${TRIAL.freelancer.users} user and ${TRIAL.freelancer.messages} messages.`,
  },
  {
    q: "Should I pick a freelancer plan or a team plan?",
    a: "Pick a freelancer plan if you work alone. Pick a team plan if more than one person replies to leads. Team plans add assignments, a My Team view, the chatbot and chat widget, CSAT surveys, roles and audit logs. You can switch to a team setup later in Settings.",
  },
  {
    q: "What happens when I reach a monthly limit?",
    a: "Wazelo warns you when you have used 80% of a monthly limit, such as messages or campaigns. At the limit, upgrade and the higher limit applies straight away.",
  },
  {
    q: "Can I change my plan later?",
    a: "Yes. An upgrade starts immediately and you pay only the difference for the rest of your billing period. A downgrade takes effect at the end of the current billing period.",
  },
  {
    q: "How does yearly billing work?",
    a: "You pay for 10 months and use Wazelo for 12. Yearly prices are shown in the Yearly view above.",
  },
];
