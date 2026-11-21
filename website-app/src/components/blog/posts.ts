// Blog registry. Each post's body lives in src/content/blog/<slug>.tsx; its metadata is
// here so the index, sitemap and RSS feed can list posts without rendering them.
// Topics and pillars come from reference/content-strategy.md.
import type { ComponentType } from "react";
import LeadAdsToWhatsApp, { toc as leadAdsToc } from "@/content/blog/facebook-lead-ads-to-whatsapp";
import FollowUpTemplates, { toc as followUpToc } from "@/content/blog/whatsapp-follow-up-templates";
import FollowUpSchedule, { toc as scheduleToc } from "@/content/blog/how-many-times-to-follow-up-a-lead";
import TwentyFourHourRule, { toc as windowToc } from "@/content/blog/whatsapp-24-hour-rule";
import ApiPricing, { toc as pricingToc } from "@/content/blog/whatsapp-business-api-pricing";
import NumberBans, { toc as bansToc } from "@/content/blog/whatsapp-number-banned-or-limited";
import RealEstatePlaybook, { toc as realEstateToc } from "@/content/blog/real-estate-whatsapp-follow-up";
import FreelancerGoogleMaps, { toc as freelancerToc } from "@/content/blog/freelancers-find-clients-google-maps";
import SpeedToLeadStats, { toc as statsToc } from "@/content/blog/speed-to-lead-statistics";
import AgencyReport, { toc as agencyToc } from "@/content/blog/agency-whatsapp-lead-report";
import Glossary, { toc as glossaryToc } from "@/content/blog/whatsapp-business-glossary";

export type Pillar = "Speed to lead" | "WhatsApp follow-up" | "WhatsApp API explained" | "Selling on WhatsApp";

export interface Post {
  slug: string;
  title: string;
  /** 120–160 characters, for search results and the index card. */
  description: string;
  /** ISO dates (YYYY-MM-DD). Bump `updated` only when the content really changes. */
  published: string;
  updated: string;
  author: string;
  pillar: Pillar;
  readMinutes: number;
  /**
   * True while the post still shows "Screenshot coming soon" boxes. Such posts are
   * listed on /blog but kept out of search (noindex), the sitemap and the RSS feed.
   */
  hasPlaceholders: boolean;
  /** Pages the post points readers to at the end. */
  related: { label: string; href: string }[];
  Content: ComponentType;
  toc: { id: string; label: string }[];
}

export const POSTS: Post[] = [
  {
    slug: "facebook-lead-ads-to-whatsapp",
    title: "How to Reply to Facebook Lead Ads on WhatsApp in Seconds (Without Google Sheets)",
    description:
      "Send a WhatsApp welcome to every Facebook and Instagram lead within seconds, straight from Meta, then follow up until they reply. Setup steps and templates.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "Speed to lead",
    readMinutes: 6,
    hasPlaceholders: true,
    related: [
      { label: "Meta lead ads in Wazelo", href: "/features/lead-ads" },
      { label: "Follow-up sequences", href: "/features/sequences" },
      { label: "Wazelo for real estate", href: "/use-cases/real-estate" },
    ],
    Content: LeadAdsToWhatsApp,
    toc: leadAdsToc,
  },
  {
    slug: "whatsapp-follow-up-templates",
    title: "WhatsApp Follow-up Message Templates: 17 Copy-Ready Examples (With the Right Meta Category)",
    description:
      "17 WhatsApp follow-up messages for real estate, coaching, agencies, freelancers and shops, labelled utility or marketing, with when to send each one.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp follow-up",
    readMinutes: 8,
    hasPlaceholders: false,
    related: [
      { label: "Follow-up sequences in Wazelo", href: "/features/sequences" },
      { label: "Reply to lead ads on WhatsApp in seconds", href: "/blog/facebook-lead-ads-to-whatsapp" },
      { label: "Wazelo for freelancers", href: "/use-cases/freelancers" },
    ],
    Content: FollowUpTemplates,
    toc: followUpToc,
  },
  {
    slug: "how-many-times-to-follow-up-a-lead",
    title: "How Many Times Should You Follow Up a Lead? A WhatsApp Schedule for 5 Situations",
    description:
      "Day-by-day WhatsApp follow-up schedules for new leads, quiet leads, quotes, booked visits and cold pitches, with what to send at each step and when to stop.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp follow-up",
    readMinutes: 7,
    hasPlaceholders: false,
    related: [
      { label: "17 WhatsApp follow-up templates", href: "/blog/whatsapp-follow-up-templates" },
      { label: "Follow-up sequences in Wazelo", href: "/features/sequences" },
      { label: "Lead scoring", href: "/features/lead-scoring" },
    ],
    Content: FollowUpSchedule,
    toc: scheduleToc,
  },
  {
    slug: "whatsapp-24-hour-rule",
    title: "The WhatsApp 24-Hour Rule: When You Can Message a Lead (and When You Need a Template)",
    description:
      "How WhatsApp's 24-hour customer service window works: what opens it, what you can send inside and outside it, what it costs, and the 7-day ad exception.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp follow-up",
    readMinutes: 6,
    hasPlaceholders: false,
    related: [
      { label: "How many times to follow up a lead", href: "/blog/how-many-times-to-follow-up-a-lead" },
      { label: "17 WhatsApp follow-up templates", href: "/blog/whatsapp-follow-up-templates" },
      { label: "Shared inbox in Wazelo", href: "/features/shared-inbox" },
    ],
    Content: TwentyFourHourRule,
    toc: windowToc,
  },
  {
    slug: "whatsapp-business-api-pricing",
    title: "WhatsApp Business API Pricing in 2026: What Each Message Costs, in India and Abroad",
    description:
      "How Meta prices WhatsApp Business API messages from 1 October 2026: categories, free tiers, volume tiers, rates by country and a worked monthly cost.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp API explained",
    readMinutes: 7,
    // The rate table and worked cost wait on Meta's official rate card files.
    hasPlaceholders: true,
    related: [
      { label: "The WhatsApp 24-hour rule", href: "/blog/whatsapp-24-hour-rule" },
      { label: "Wazelo pricing", href: "/pricing" },
      { label: "Compare WhatsApp CRMs", href: "/compare" },
    ],
    Content: ApiPricing,
    toc: pricingToc,
  },
  {
    slug: "whatsapp-number-banned-or-limited",
    title: "Why WhatsApp Numbers Get Limited or Banned (and How to Avoid It)",
    description:
      "Messaging limits, template pausing, per-person marketing limits and policy bans on the WhatsApp Business API: what triggers each, and how to stay clear.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp API explained",
    readMinutes: 8,
    hasPlaceholders: false,
    related: [
      { label: "The WhatsApp 24-hour rule", href: "/blog/whatsapp-24-hour-rule" },
      { label: "How many times to follow up a lead", href: "/blog/how-many-times-to-follow-up-a-lead" },
      { label: "Security at Wazelo", href: "/security" },
    ],
    Content: NumberBans,
    toc: bansToc,
  },
  {
    slug: "real-estate-whatsapp-follow-up",
    title: "Real Estate WhatsApp Follow-up: A Site-Visit Playbook From Enquiry to Booking",
    description:
      "A step-by-step WhatsApp playbook for real estate teams: first reply, qualifying questions, site-visit reminders, no-shows and follow-up after the visit.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "Selling on WhatsApp",
    readMinutes: 7,
    hasPlaceholders: false,
    related: [
      { label: "Wazelo for real estate", href: "/use-cases/real-estate" },
      { label: "17 WhatsApp follow-up templates", href: "/blog/whatsapp-follow-up-templates" },
      { label: "Deals pipeline", href: "/features/deals" },
    ],
    Content: RealEstatePlaybook,
    toc: realEstateToc,
  },
  {
    slug: "freelancers-find-clients-google-maps",
    title: "How Freelancers Find Clients on Google Maps (and Follow Up on WhatsApp the Right Way)",
    description:
      "Find local businesses that need your skills on Google Maps, contact them in a way WhatsApp allows, then pitch, send the proposal and follow up.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "Selling on WhatsApp",
    readMinutes: 7,
    hasPlaceholders: false,
    related: [
      { label: "Wazelo for freelancers", href: "/use-cases/freelancers" },
      { label: "Lead finder", href: "/features/lead-finder" },
      { label: "Why WhatsApp numbers get banned", href: "/blog/whatsapp-number-banned-or-limited" },
    ],
    Content: FreelancerGoogleMaps,
    toc: freelancerToc,
  },
  {
    slug: "speed-to-lead-statistics",
    title: "Speed-to-Lead Statistics: What the Research Actually Shows (and What It Doesn't)",
    description:
      "The lead response statistics everyone quotes, checked against the original studies: what they measured, their limits, and which numbers have no source.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "Speed to lead",
    readMinutes: 6,
    hasPlaceholders: false,
    related: [
      { label: "Reply to lead ads on WhatsApp in seconds", href: "/blog/facebook-lead-ads-to-whatsapp" },
      { label: "How many times to follow up a lead", href: "/blog/how-many-times-to-follow-up-a-lead" },
      { label: "Analytics in Wazelo", href: "/features/analytics" },
    ],
    Content: SpeedToLeadStats,
    toc: statsToc,
  },
  {
    slug: "agency-whatsapp-lead-report",
    title: "How Agencies Report WhatsApp Lead Results to Clients (With a Monthly Report Template)",
    description:
      "A monthly report structure for agencies running WhatsApp lead follow-up: the definitions to agree, where each number comes from and what to leave out.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "Selling on WhatsApp",
    readMinutes: 6,
    hasPlaceholders: false,
    related: [
      { label: "Wazelo for agencies", href: "/use-cases/agencies" },
      { label: "Analytics in Wazelo", href: "/features/analytics" },
      { label: "Speed-to-lead statistics", href: "/blog/speed-to-lead-statistics" },
    ],
    Content: AgencyReport,
    toc: agencyToc,
  },
  {
    slug: "whatsapp-business-glossary",
    title: "WhatsApp Business Glossary: 25 Terms Explained in Plain English",
    description:
      "Templates, the 24-hour window, service messages, messaging limits, quality ratings, opt-in and more: 25 WhatsApp Business terms explained simply.",
    published: "2026-11-21",
    updated: "2026-11-21",
    author: "Wazelo team",
    pillar: "WhatsApp API explained",
    readMinutes: 5,
    hasPlaceholders: false,
    related: [
      { label: "The WhatsApp 24-hour rule", href: "/blog/whatsapp-24-hour-rule" },
      { label: "Why WhatsApp numbers get limited or banned", href: "/blog/whatsapp-number-banned-or-limited" },
      { label: "All Wazelo features", href: "/features" },
    ],
    Content: Glossary,
    toc: glossaryToc,
  },
];

/** Newest first. */
export const postsByDate = () => [...POSTS].sort((a, b) => b.published.localeCompare(a.published));
export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
/** Posts ready for search engines and feeds. */
export const indexablePosts = () => postsByDate().filter((p) => !p.hasPlaceholders);

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
