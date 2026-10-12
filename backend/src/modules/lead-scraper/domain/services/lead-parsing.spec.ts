import {
  coordsFromMapsUrl,
  distanceKm,
  hoursFlags,
  isMobileNumber,
  parseBudget,
  parsePriceLevel,
  parseProposals,
  parseRelativeTime,
  zoomForRadius,
} from './lead-parsing';
import { matchesFilters, hasActiveFilters } from './lead-filters';
import { ScrapedLead } from '../scrapers/scraper.interface';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const DAY = 86_400_000;

describe('lead parsing', () => {
  it('parses relative times', () => {
    expect(parseRelativeTime('Posted 2 hours ago', NOW)?.getTime()).toBe(NOW.getTime() - 2 * 3_600_000);
    expect(parseRelativeTime('a month ago', NOW)?.getTime()).toBe(NOW.getTime() - 30 * DAY);
    expect(parseRelativeTime('Edited 3 weeks ago', NOW)?.getTime()).toBe(NOW.getTime() - 21 * DAY);
    expect(parseRelativeTime('yesterday', NOW)?.getTime()).toBe(NOW.getTime() - DAY);
    expect(parseRelativeTime('recently', NOW)).toBeUndefined();
  });

  it('parses budgets', () => {
    expect(parseBudget('Hourly: $15.00-$40.00')).toEqual({ min: 15, max: 40, type: 'hourly' });
    expect(parseBudget('Fixed-price · Est. budget: $500')).toEqual({ min: 500, max: 500, type: 'fixed' });
    expect(parseBudget('₹1,500 - ₹12,500')).toEqual({ min: 1500, max: 12500, type: undefined });
    expect(parseBudget('$2k')).toEqual({ min: 2000, max: 2000, type: undefined });
  });

  it('parses proposal tiers', () => {
    expect(parseProposals('Proposals: Less than 5')).toBe(4);
    expect(parseProposals('Proposals: 10 to 15')).toBe(15);
    expect(parseProposals('50+')).toBe(50);
    expect(parseProposals('')).toBeUndefined();
  });

  it('tells Indian mobiles from landlines', () => {
    expect(isMobileNumber('+919876543210')).toBe(true);
    expect(isMobileNumber('+914424567890')).toBe(false);
    expect(isMobileNumber('+14155550100')).toBeUndefined();
  });

  it('reads coordinates and distances', () => {
    const url = 'https://www.google.com/maps/place/Gym/data=!4m7!3m6!1s0x0:0x1!8m2!3d13.0827!4d80.2707!16s';
    expect(coordsFromMapsUrl(url)).toEqual({ lat: 13.0827, lng: 80.2707 });
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/gym/@12.97,77.59,13z')).toEqual({ lat: 12.97, lng: 77.59 });
    // Chennai Central → T. Nagar is roughly 6 km
    expect(distanceKm({ lat: 13.0827, lng: 80.2707 }, { lat: 13.0418, lng: 80.2341 })).toBeGreaterThan(5);
    expect(distanceKm({ lat: 13.0827, lng: 80.2707 }, { lat: 13.0418, lng: 80.2341 })).toBeLessThan(7);
    expect(zoomForRadius(3)).toBe(13);
  });

  it('reads price levels and hours', () => {
    expect(parsePriceLevel('Price: Moderate')).toBe(2);
    expect(parsePriceLevel('₹₹₹')).toBe(3);
    expect(parsePriceLevel('Gym')).toBeUndefined();
    expect(hoursFlags('Monday, Open 24 hours; Saturday, Open 24 hours; Sunday, Open 24 hours')).toEqual({
      open24h: true,
      openWeekends: true,
    });
    expect(hoursFlags('Monday, 9 am to 9 pm; Saturday, 9 am to 2 pm; Sunday, Closed')).toEqual({
      open24h: false,
      openWeekends: false,
    });
    expect(hoursFlags(null, 'Closes 9 pm')).toEqual({ open24h: undefined, openWeekends: undefined });
  });
});

describe('matchesFilters — extended', () => {
  const place = (o: Partial<ScrapedLead>): ScrapedLead => ({ sourceUrl: 'https://maps/x', scrapedAt: NOW.toISOString(), ...o });

  it('counts only filters that drop leads as active', () => {
    expect(hasActiveFilters({ areas: ['600017'], radiusKm: 5, findEmails: true })).toBe(false);
    expect(hasActiveFilters({ mobileOnly: true })).toBe(true);
    expect(hasActiveFilters({ excludeWords: [] })).toBe(false);
  });

  it('applies mobile, category and name filters', () => {
    expect(matchesFilters(place({ phone: '+914424567890' }), { mobileOnly: true })).toBe(false);
    expect(matchesFilters(place({ phone: '+14155550100' }), { mobileOnly: true })).toBe(true);
    expect(matchesFilters(place({ category: 'Yoga studio' }), { includeCategories: ['gym'] })).toBe(false);
    expect(matchesFilters(place({ category: 'Fitness Gym' }), { includeCategories: ['gym'], excludeCategories: ['yoga'] })).toBe(true);
    expect(matchesFilters(place({ name: "Gold's Gym T Nagar" }), { excludeWords: ["gold's", 'cult'] })).toBe(false);
  });

  it('lets unknown fields through but drops known failures', () => {
    expect(matchesFilters(place({}), { maxPhotos: 10, priceLevels: [1], open24h: true, activeWithinMonths: 3 })).toBe(true);
    expect(matchesFilters(place({ photoCount: 40 }), { maxPhotos: 10 })).toBe(false);
    expect(matchesFilters(place({ claimed: true }), { unclaimedOnly: true })).toBe(false);
    expect(matchesFilters(place({ lastReviewAt: new Date(NOW.getTime() - 200 * DAY).toISOString() }), { activeWithinMonths: 3 }, NOW)).toBe(false);
  });

  it('applies website issue filters to inspected sites only', () => {
    const goodSite = { https: true, mobileFriendly: true, hasPixel: true, hasAnalytics: true };
    expect(matchesFilters(place({}), { websiteIssues: ['noPixel'] })).toBe(false);
    expect(matchesFilters(place({ website: 'https://x.in', site: goodSite }), { websiteIssues: ['noPixel'] })).toBe(false);
    expect(matchesFilters(place({ website: 'https://x.in', site: { ...goodSite, hasPixel: false } }), { websiteIssues: ['noPixel'] })).toBe(true);
  });

  it('applies job filters', () => {
    const job = place({
      jobTitle: 'Build a WordPress site',
      skills: ['WordPress', 'PHP'],
      budgetMin: 100,
      budgetMax: 300,
      budgetType: 'fixed',
      postedAt: new Date(NOW.getTime() - 2 * DAY).toISOString(),
      paymentVerified: true,
      proposals: 8,
      clientCountry: 'India',
    });
    expect(matchesFilters(job, { minBudget: 200, budgetType: 'fixed', postedWithinDays: 3, includeSkills: ['wordpress'] }, NOW)).toBe(true);
    expect(matchesFilters(job, { minBudget: 500 }, NOW)).toBe(false);
    expect(matchesFilters(job, { maxBudget: 50 }, NOW)).toBe(false);
    expect(matchesFilters(job, { budgetType: 'hourly' }, NOW)).toBe(false);
    expect(matchesFilters(job, { postedWithinDays: 1 }, NOW)).toBe(false);
    expect(matchesFilters(job, { excludeSkills: ['php'] }, NOW)).toBe(false);
    expect(matchesFilters(job, { maxProposals: 5 }, NOW)).toBe(false);
    expect(matchesFilters(job, { clientCountry: 'united states' }, NOW)).toBe(false);
    expect(matchesFilters({ ...job, paymentVerified: false }, { paymentVerified: true }, NOW)).toBe(false);
  });
});
