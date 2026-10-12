import { ScrapedLead } from '../scrapers/scraper.interface';

export type LeadTag =
  | 'No website'
  | 'Low rating'
  | 'Few reviews'
  | 'No reviews'
  | 'No phone'
  | 'Has email'
  | 'Closed'
  | 'Unclaimed'
  | 'No SSL'
  | 'Not mobile-friendly'
  | 'No FB Pixel'
  | 'No Analytics';

export interface LeadScore {
  /** 0–10: how reachable the business is and how much it needs help online */
  score: number;
  tags: LeadTag[];
}

const LOW_RATING = 4.0;
const FEW_REVIEWS = 20;

/**
 * Score a Google Maps business as a sales prospect. Reachability (phone, email)
 * and visible weak spots (no website, low rating, few reviews) raise the score —
 * they are what an agency or service seller pitches on.
 */
export function scoreLead(lead: ScrapedLead): LeadScore {
  if (lead.closed) return { score: 0, tags: ['Closed'] };

  const tags: LeadTag[] = [];
  let score = 0;

  if (lead.phone) score += 4;
  else tags.push('No phone');

  if (lead.email) {
    score += 1;
    tags.push('Has email');
  }

  if (!lead.website) {
    score += 2;
    tags.push('No website');
  }

  if (lead.reviewCount == null || lead.reviewCount === 0) {
    score += 2;
    tags.push('No reviews');
  } else {
    if (lead.rating != null && lead.rating < LOW_RATING) {
      score += 2;
      tags.push('Low rating');
    }
    if (lead.reviewCount < FEW_REVIEWS) {
      score += 1;
      tags.push('Few reviews');
    }
  }

  // Extra pitch hooks — shown as tags, not scored, so the score stays comparable
  // between runs that did and didn't inspect websites
  if (lead.claimed === false) tags.push('Unclaimed');
  if (lead.site) {
    if (!lead.site.https) tags.push('No SSL');
    if (!lead.site.mobileFriendly) tags.push('Not mobile-friendly');
    if (!lead.site.hasPixel) tags.push('No FB Pixel');
    if (!lead.site.hasAnalytics) tags.push('No Analytics');
  }

  return { score: Math.min(score, 10), tags };
}
