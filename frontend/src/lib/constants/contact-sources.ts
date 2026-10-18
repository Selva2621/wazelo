import type { ContactSource } from "@/lib/types/contacts";
import type { ScrapeSource } from "@/lib/types/lead-scraper";

/** How a contact came in — shown on contact rows, filters and campaign audiences */
export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "Email",
  MANUAL: "Manual",
  IMPORT: "Import",
  API: "API",
  FACEBOOK_LEAD_AD: "FB Lead Ad",
  INSTAGRAM_LEAD_AD: "IG Lead Ad",
  WHATSAPP_LEAD_AD: "WA Lead Ad",
  SHOPIFY: "Shopify",
  WEB_SCRAPE: "Lead Scraper",
};

export const CONTACT_SOURCES = Object.keys(CONTACT_SOURCE_LABELS) as ContactSource[];

export const SCRAPE_SOURCE_LABELS: Record<ScrapeSource, string> = {
  GOOGLE_MAPS: "Google Maps",
  UPWORK_JOBS: "Upwork",
  FREELANCER_IN: "Freelancer.in",
  TRUELANCER: "Truelancer",
  LINKEDIN_JOBS: "LinkedIn Jobs",
};
