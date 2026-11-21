import { ScrapedLead } from '../scrapers/scraper.interface';
import { hoursFlags, isMobileNumber } from './lead-parsing';

export type WebsiteIssue = 'noSsl' | 'notMobile' | 'noPixel' | 'noAnalytics';

/** Optional filters chosen before a scrape. */
export interface LeadFilters {
  // ── All sources ──
  /** ISO country searched in — phones without a country code are read as its. Not a filter. */
  country?: string;
  /** Skip leads already found by an earlier run */
  newOnly?: boolean;
  /** Skip phone numbers already saved as contacts */
  skipExistingContacts?: boolean;

  // ── Google Maps ──
  minRating?: number;
  minReviews?: number;
  maxReviews?: number;
  hasPhone?: boolean;
  mobileOnly?: boolean;
  noWebsite?: boolean;
  skipClosed?: boolean;
  findEmails?: boolean;
  includeCategories?: string[];
  excludeCategories?: string[];
  /** Skip names containing any of these (chains, franchises) */
  excludeWords?: string[];
  social?: 'has' | 'none';
  unclaimedOnly?: boolean;
  maxPhotos?: number;
  open24h?: boolean;
  openWeekends?: boolean;
  priceLevels?: number[];
  /** Pincodes / localities searched one by one instead of the location field */
  areas?: string[];
  radiusKm?: number;
  /** Newest review within this many months */
  activeWithinMonths?: number;
  /** Keep only websites showing at least one of these issues */
  websiteIssues?: WebsiteIssue[];

  // ── Job boards ──
  minBudget?: number;
  maxBudget?: number;
  budgetType?: 'fixed' | 'hourly';
  postedWithinDays?: number;
  includeSkills?: string[];
  excludeSkills?: string[];
  paymentVerified?: boolean;
  maxProposals?: number;
  clientCountry?: string;
}

const lower = (v: string | undefined | null) => (v ?? '').toLowerCase();
const containsAny = (text: string, terms: string[] | undefined) =>
  !!terms?.some((t) => t.trim() && text.includes(t.trim().toLowerCase()));
const DAY_MS = 86_400_000;

/** Filters that drop leads (findEmails, areas and radius change how scraping runs instead). */
export function hasActiveFilters(f: LeadFilters | null | undefined): boolean {
  if (!f) return false;
  const { findEmails: _e, areas: _a, radiusKm: _r, country: _c, ...rest } = f;
  return Object.values(rest).some((v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== false));
}

/** Website problems found on a lead's site, in filter terms */
export function websiteIssuesOf(lead: ScrapedLead): WebsiteIssue[] {
  if (!lead.site) return [];
  const issues: WebsiteIssue[] = [];
  if (!lead.site.https) issues.push('noSsl');
  if (!lead.site.mobileFriendly) issues.push('notMobile');
  if (!lead.site.hasPixel) issues.push('noPixel');
  if (!lead.site.hasAnalytics) issues.push('noAnalytics');
  return issues;
}

/**
 * Checks that only need the scraped fields. A lead is dropped only on what we know:
 * when a page didn't show a field (photos, hours, budget…), that filter lets it through.
 * Database checks (newOnly, skipExistingContacts) run separately.
 */
export function matchesFilters(lead: ScrapedLead, f: LeadFilters | null | undefined, now = new Date()): boolean {
  if (!f) return true;

  // ── Google Maps ──
  if (f.skipClosed && lead.closed) return false;
  if (f.hasPhone && !lead.phone) return false;
  if (f.mobileOnly && (!lead.phone || isMobileNumber(lead.phone) === false)) return false;
  if (f.noWebsite && lead.website) return false;
  // A place with no rating fails a minimum-rating filter
  if (f.minRating != null && (lead.rating ?? 0) < f.minRating) return false;
  const reviews = lead.reviewCount ?? 0;
  if (f.minReviews != null && reviews < f.minReviews) return false;
  if (f.maxReviews != null && reviews > f.maxReviews) return false;

  const category = lower(lead.category);
  if (f.includeCategories?.length && category && !containsAny(category, f.includeCategories)) return false;
  if (f.excludeCategories?.length && containsAny(category, f.excludeCategories)) return false;
  if (f.excludeWords?.length && containsAny(lower(lead.name), f.excludeWords)) return false;

  if (f.social === 'has' && !lead.socialLinks?.length) return false;
  if (f.social === 'none' && lead.socialLinks?.length) return false;
  if (f.unclaimedOnly && lead.claimed === true) return false;
  if (f.maxPhotos != null && lead.photoCount != null && lead.photoCount > f.maxPhotos) return false;
  if (f.priceLevels?.length && lead.priceLevel != null && !f.priceLevels.includes(lead.priceLevel)) return false;

  if (f.open24h || f.openWeekends) {
    const hours = hoursFlags(lead.weeklyHours, lead.openingHours);
    if (f.open24h && hours.open24h === false) return false;
    if (f.openWeekends && hours.openWeekends === false) return false;
  }

  if (f.activeWithinMonths != null && lead.lastReviewAt) {
    const cutoff = now.getTime() - f.activeWithinMonths * 30 * DAY_MS;
    if (new Date(lead.lastReviewAt).getTime() < cutoff) return false;
  }

  if (f.websiteIssues?.length) {
    // Only businesses whose site we could inspect — "no website" has its own filter
    if (!lead.website) return false;
    if (lead.site && !websiteIssuesOf(lead).some((i) => f.websiteIssues!.includes(i))) return false;
  }

  // ── Job boards ──
  if (f.minBudget != null && (lead.budgetMax ?? lead.budgetMin) != null && (lead.budgetMax ?? lead.budgetMin)! < f.minBudget) return false;
  if (f.maxBudget != null && (lead.budgetMin ?? lead.budgetMax) != null && (lead.budgetMin ?? lead.budgetMax)! > f.maxBudget) return false;
  if (f.budgetType && lead.budgetType && lead.budgetType !== f.budgetType) return false;
  if (f.postedWithinDays != null && lead.postedAt) {
    if (new Date(lead.postedAt).getTime() < now.getTime() - f.postedWithinDays * DAY_MS) return false;
  }
  const jobText = [lead.jobTitle, ...(lead.skills ?? [])].map(lower).join(' | ');
  if (f.includeSkills?.length && !containsAny(jobText, f.includeSkills)) return false;
  if (f.excludeSkills?.length && containsAny(jobText, f.excludeSkills)) return false;
  if (f.paymentVerified && lead.paymentVerified === false) return false;
  if (f.maxProposals != null && lead.proposals != null && lead.proposals > f.maxProposals) return false;
  if (f.clientCountry?.trim()) {
    const country = lower(lead.clientCountry ?? lead.location);
    if (country && !country.includes(f.clientCountry.trim().toLowerCase())) return false;
  }

  return true;
}
