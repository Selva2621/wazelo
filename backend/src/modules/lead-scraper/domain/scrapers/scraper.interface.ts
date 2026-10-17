export interface WebsiteSignals {
  https: boolean;
  mobileFriendly: boolean;
  hasPixel: boolean;
  hasAnalytics: boolean;
}

export interface ScrapedLead {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  address?: string;
  budget?: string;
  skills?: string[];
  website?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  description?: string;
  openingHours?: string;
  socialLinks?: string[];
  /** Listing is marked permanently/temporarily closed */
  closed?: boolean;
  sourceUrl: string;
  scrapedAt: string;

  // ── Google Maps extras (undefined = not found on the page) ──
  /** false when the listing offers "Claim this business" */
  claimed?: boolean;
  photoCount?: number;
  /** 1 (₹) – 4 (₹₹₹₹) */
  priceLevel?: number;
  /** Full week, e.g. "Monday, 9 am to 9 pm; …; Sunday, Closed" */
  weeklyHours?: string;
  lat?: number;
  lng?: number;
  /** Approximate date of the newest review (ISO) */
  lastReviewAt?: string;
  /** Filled when the website was fetched (email search or website filters) */
  site?: WebsiteSignals;

  // ── Job-board extras ──
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: 'fixed' | 'hourly';
  /** ISO */
  postedAt?: string;
  paymentVerified?: boolean;
  proposals?: number;
  clientCountry?: string;
}

export interface ScrapeOptions {
  /**
   * Keep only leads passing this check. Scrapers that can (Google Maps) apply it while
   * scraping, so `maxResults` counts matching leads rather than everything visited.
   */
  accept?: (lead: ScrapedLead) => boolean | Promise<boolean>;
  /** Google Maps: search each of these areas (pincodes / localities) instead of `location` */
  areas?: string[];
  /** Google Maps: only places within this distance of `location` */
  radiusKm?: number;
  /** Google Maps: open the reviews tab to find the newest review date (slower) */
  collectLastReview?: boolean;
  /** Aborted on timeout or cancel — browser scrapers close their browser so pending steps fail fast */
  signal?: AbortSignal;
}

export interface IScraper {
  scrape(keywords: string, location?: string, maxResults?: number, options?: ScrapeOptions): Promise<ScrapedLead[]>;
}
