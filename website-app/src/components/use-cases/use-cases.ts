// Content for the /use-cases/[slug] pages. Each page follows one example lead through
// its first days, using only features Wazelo has today (lead ads → product teams with
// round-robin, 30-minute reminder, day-end summary, sequences, proposals, CSV export).

export const HUB_SEO = {
  path: "/use-cases",
  title: "Lead Follow-up Use Cases by Industry",
  description:
    "How real estate teams, agencies, freelancers, shops, coaching institutes and finance teams use Wazelo to answer leads on WhatsApp in seconds and follow up until they buy.",
};

export interface TimelineStep {
  when: string;
  what: string;
}

export interface UseCase {
  slug: string;
  /** Short name for cards, breadcrumbs and links. */
  name: string;
  kicker: string;
  title: [string, string];
  subtitle: string;
  media:
    | { kind: "photo"; src: string; width: number; height: number; alt: string }
    | { kind: "clip"; clip: string; label: string };
  /** Who the example lead is, shown above the timeline. */
  storyIntro: string;
  timeline: TimelineStep[];
  /** One feature of Wazelo that matters most to this audience. */
  highlight: { title: string; body: string };
  /** Feature page hrefs, looked up in feature-groups for label and description. */
  features: string[];
  plan: { slugs: string[]; note: string };
  /** The blog guide that covers this audience in depth. */
  guide: { title: string; blurb: string; href: string };
  seoTitle: string;
  seoDescription: string;
}

export const USE_CASES: UseCase[] = [
  {
    slug: "real-estate",
    name: "Real estate",
    kicker: "For real estate teams",
    title: ["Every property enquiry,", "answered and chased."],
    subtitle:
      "Leads from your Facebook and Instagram property ads get a WhatsApp reply in seconds. Wazelo reminds the agent, follows up on schedule and tracks each buyer to a closed deal.",
    media: { kind: "photo", src: "/media/story/realty.jpg", width: 1024, height: 1280, alt: "A real estate agent replying to a buyer on WhatsApp" },
    storyIntro: "An example: Priya sees your 2BHK ad on Instagram on a Monday morning.",
    timeline: [
      { when: "10:02", what: "Priya fills the ad form. Her details land in Wazelo straight from Meta." },
      { when: "10:02", what: "She gets a WhatsApp welcome, and the lead goes to the next agent on that project's team." },
      { when: "10:32", what: "Nobody has contacted her yet, so the agent gets a reminder." },
      { when: "19:00", what: "Your manager's day-end summary shows which leads were contacted and which are waiting." },
      { when: "Day 2", what: "Her follow-up sequence asks if Saturday works for a site visit. It stops when she replies." },
      { when: "Day 9", what: "The booking is done and the deal moves to Won in the pipeline." },
    ],
    highlight: {
      title: "One team per project",
      body: "Set up each project as a product and link its lead form. Every enquiry goes to that project's team, shared in turn, so no lead sits unassigned.",
    },
    features: ["/features/lead-ads", "/features/sequences", "/features/deals", "/features/lead-scoring", "/features/shared-inbox", "/features/proposals"],
    plan: { slugs: ["growth", "pro"], note: "Growth fits a sales team of up to 15. Pro covers several projects with up to 50 agents." },
    guide: {
      title: "Real estate WhatsApp follow-up: a site-visit playbook",
      blurb: "Qualifying questions, visit reminders, no-shows and what to send after the visit, with templates.",
      href: "/blog/real-estate-whatsapp-follow-up",
    },
    seoTitle: "WhatsApp CRM for Real Estate: Follow Up Every Property Lead",
    seoDescription:
      "Answer Facebook and Instagram property leads on WhatsApp in seconds, route them to the right project team, remind agents and follow up until the site visit.",
  },
  {
    slug: "agencies",
    name: "Agencies",
    kicker: "For marketing agencies",
    title: ["Every client's leads,", "followed up from one place."],
    subtitle:
      "Link each client's Meta lead forms, reply on WhatsApp within seconds, follow up on schedule and export the numbers for the monthly report.",
    media: { kind: "clip", clip: "ch3-follow", label: "A follow-up sequence running in the Wazelo app" },
    storyIntro: "An example: a lead fills your client's Facebook form for a free consultation.",
    timeline: [
      { when: "09:40", what: "The lead arrives in Wazelo from Meta, tagged to your client's brand." },
      { when: "09:40", what: "A WhatsApp welcome goes out, and the lead goes to that client's team." },
      { when: "10:10", what: "Not contacted after 30 minutes, so the owner gets a reminder." },
      { when: "Day 3", what: "The follow-up sequence sends a second message, and the lead books a call." },
      { when: "Day 30", what: "Export the month's analytics as CSV for the client report." },
    ],
    highlight: {
      title: "A brand for each client",
      body: "Create a brand for every client and link its lead forms to it. Leads, teams and campaign audiences stay separate per brand inside one Wazelo account.",
    },
    features: ["/features/lead-ads", "/features/campaigns", "/features/sequences", "/features/automation", "/features/analytics", "/features/ai-assistant"],
    plan: { slugs: ["growth", "pro"], note: "Growth includes 15 WhatsApp numbers, Pro 50. Enterprise adds white-label options." },
    guide: {
      title: "How agencies report WhatsApp lead results to clients",
      blurb: "The definitions to agree, where each number comes from, and a five-page monthly report template.",
      href: "/blog/agency-whatsapp-lead-report",
    },
    seoTitle: "WhatsApp CRM for Agencies: Follow Up Every Client's Leads",
    seoDescription:
      "Run your clients' Meta lead ads, WhatsApp replies, follow-ups and campaigns from one account, with a brand per client and CSV reports at month end.",
  },
  {
    slug: "freelancers",
    name: "Freelancers",
    kicker: "For freelancers",
    title: ["Find clients,", "and never forget to follow up."],
    subtitle:
      "Wazelo finds businesses to pitch on Google Maps, keeps your clients in a simple pipeline, sends the proposal on WhatsApp and follows up until they reply.",
    media: { kind: "clip", clip: "ch1-find", label: "The lead finder searching Google Maps in the Wazelo app" },
    storyIntro: "An example: a freelance web designer looking for new clients.",
    timeline: [
      { when: "Mon", what: "Search Google Maps for bakeries in your city and add 20 of them as leads." },
      { when: "Tue", what: "Call or email each one, and ask the interested ones if you can send an example on WhatsApp." },
      { when: "Tue", what: "Send the ones who said yes a pitch from a freelancer template." },
      { when: "Thu", what: "Those who haven't replied get a second note from your follow-up sequence." },
      { when: "Fri", what: "Two bakeries ask for a quote. Send a proposal on WhatsApp, and the client accepts it from a link." },
    ],
    highlight: {
      title: "Built for one person",
      body: "Choose Solo at sign-up for a simple setup: one user, one WhatsApp number, 26 freelancer templates. Move to a team plan later from Settings.",
    },
    features: ["/features/lead-finder", "/features/proposals", "/features/sequences", "/features/campaigns", "/features/mobile-app", "/features/ai-assistant"],
    plan: { slugs: ["solo", "solo-pro"], note: "Solo Pro adds more messages, campaigns and AI credits when work picks up." },
    guide: {
      title: "How freelancers find clients on Google Maps",
      blurb: "Finding businesses that need you, contacting them the way WhatsApp allows, then pitching and following up.",
      href: "/blog/freelancers-find-clients-google-maps",
    },
    seoTitle: "WhatsApp CRM for Freelancers: Find Clients and Follow Up",
    seoDescription:
      "Find businesses to pitch on Google Maps, send proposals on WhatsApp and let follow-ups run on their own. Wazelo Solo is built for freelancers.",
  },
];

export const useCaseBySlug = (slug: string) => USE_CASES.find((u) => u.slug === slug);
