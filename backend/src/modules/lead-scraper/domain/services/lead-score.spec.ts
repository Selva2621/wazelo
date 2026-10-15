import { scoreLead } from './lead-score';
import { hasActiveFilters, matchesFilters } from './lead-filters';
import { ScrapedLead } from '../scrapers/scraper.interface';

const lead = (overrides: Partial<ScrapedLead>): ScrapedLead => ({
  sourceUrl: 'https://maps/x',
  scrapedAt: '2026-10-12T00:00:00.000Z',
  ...overrides,
});

describe('scoreLead', () => {
  it('rates a reachable business with no website and few reviews as hot', () => {
    const { score, tags } = scoreLead(lead({ phone: '+919000000001', rating: 3.6, reviewCount: 12 }));
    expect(score).toBe(9);
    expect(tags).toEqual(['No website', 'Low rating', 'Few reviews']);
  });

  it('rates an established, well-reviewed business with a website lower', () => {
    const { score, tags } = scoreLead(
      lead({ phone: '+919000000001', website: 'https://gym.in', rating: 4.7, reviewCount: 340 }),
    );
    expect(score).toBe(4);
    expect(tags).toEqual([]);
  });

  it('flags missing phone and treats no reviews as a weak spot', () => {
    const { score, tags } = scoreLead(lead({ website: 'https://x.in' }));
    expect(score).toBe(2);
    expect(tags).toEqual(['No phone', 'No reviews']);
  });

  it('scores closed places zero', () => {
    expect(scoreLead(lead({ phone: '+919000000001', closed: true }))).toEqual({ score: 0, tags: ['Closed'] });
  });

  it('caps the score at 10', () => {
    expect(scoreLead(lead({ phone: '+91900', email: 'a@b.in', rating: 3, reviewCount: 5 })).score).toBe(10);
  });
});

describe('matchesFilters', () => {
  const place = lead({ phone: '+919000000001', rating: 4.2, reviewCount: 50 });

  it('passes everything without filters', () => {
    expect(matchesFilters(place, null)).toBe(true);
    expect(hasActiveFilters({ findEmails: true })).toBe(false);
  });

  it('applies rating and review bounds', () => {
    expect(matchesFilters(place, { minRating: 4 })).toBe(true);
    expect(matchesFilters(place, { minRating: 4.5 })).toBe(false);
    expect(matchesFilters(place, { minReviews: 10, maxReviews: 40 })).toBe(false);
    expect(matchesFilters(lead({}), { minRating: 1 })).toBe(false);
  });

  it('applies phone, website and closed checks', () => {
    expect(matchesFilters(lead({}), { hasPhone: true })).toBe(false);
    expect(matchesFilters(lead({ website: 'https://x.in' }), { noWebsite: true })).toBe(false);
    expect(matchesFilters(lead({ closed: true }), { skipClosed: true })).toBe(false);
  });
});
