export type ScrapeSource =
  | "GOOGLE_MAPS"
  | "UPWORK_JOBS"
  | "FREELANCER_IN"
  | "TRUELANCER"
  | "LINKEDIN_JOBS";

export type ScrapeRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type WebsiteIssue = "noSsl" | "notMobile" | "noPixel" | "noAnalytics";

/** Chosen before a scrape. Mirrors the backend LeadFiltersDto. */
export interface LeadFilters {
  // All sources
  newOnly?: boolean;
  skipExistingContacts?: boolean;
  // Google Maps
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
  excludeWords?: string[];
  social?: "has" | "none";
  unclaimedOnly?: boolean;
  maxPhotos?: number;
  open24h?: boolean;
  openWeekends?: boolean;
  priceLevels?: number[];
  areas?: string[];
  radiusKm?: number;
  activeWithinMonths?: number;
  websiteIssues?: WebsiteIssue[];
  // Job boards
  minBudget?: number;
  maxBudget?: number;
  budgetType?: "fixed" | "hourly";
  postedWithinDays?: number;
  includeSkills?: string[];
  excludeSkills?: string[];
  paymentVerified?: boolean;
  maxProposals?: number;
  clientCountry?: string;
}

/** Source-specific extras stored per result (only fields the page showed) */
export interface ScrapeResultDetails {
  claimed?: boolean;
  photoCount?: number;
  priceLevel?: number;
  weeklyHours?: string;
  lat?: number;
  lng?: number;
  lastReviewAt?: string;
  site?: { https: boolean; mobileFriendly: boolean; hasPixel: boolean; hasAnalytics: boolean };
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: "fixed" | "hourly";
  postedAt?: string;
  paymentVerified?: boolean;
  proposals?: number;
  clientCountry?: string;
}

/** Background "is this number on WhatsApp?" check for a run */
export interface WaCheckState {
  state: "running" | "done" | "stopped" | "no_session" | "day_limit";
  resultIds?: string[];
  startedAt: string;
  finishedAt?: string;
}

export interface ScrapeRun {
  id: string;
  orgId: string;
  source: ScrapeSource;
  keywords: string;
  location?: string;
  maxResults: number;
  filters?: LeadFilters | null;
  waCheck?: WaCheckState | null;
  status: ScrapeRunStatus;
  resultCount: number;
  importedCount: number;
  skippedCount: number;
  errorMessage?: string;
  completedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeResult {
  id: string;
  scrapeRunId: string;
  orgId: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  address?: string;
  website?: string;
  budget?: string;
  skills: string[];
  rating?: number;
  reviewCount?: number;
  category?: string;
  description?: string;
  openingHours?: string;
  socialLinks: string[];
  /** 0–10 prospect score (Google Maps only) */
  score?: number | null;
  tags: string[];
  details?: ScrapeResultDetails | null;
  /** null until checked, or when the lookup failed */
  waExists?: boolean | null;
  waCheckedAt?: string | null;
  sourceUrl: string;
  imported: boolean;
  contactId?: string;
  /** A contact already has this number (here or from anywhere else) */
  existingContactId?: string | null;
  /** When an earlier run first found this lead — null if it's new */
  seenBeforeAt?: string | null;
  createdAt: string;
}

export interface TriggerScrapeRequest {
  source: ScrapeSource;
  keywords: string;
  location?: string;
  maxResults?: number;
  filters?: LeadFilters;
}

export interface ListScrapeRunsParams {
  skip?: number;
  take?: number;
  status?: ScrapeRunStatus;
  source?: ScrapeSource;
}

export interface ScrapeRunsResponse {
  runs: ScrapeRun[];
  total: number;
}

export interface ScrapeResultsResponse {
  results: ScrapeResult[];
  total: number;
}

export interface ImportScrapeResultsRequest {
  resultIds?: string[]; // empty = import all
}

export interface ImportScrapeResultsResponse {
  imported: number;
  skipped: number;
  /** Results without a phone number — not imported; bid via their job link */
  noPhone: number;
}
