import { dedupeLeads } from './dedupe-leads';
import { ScrapedLead } from '../scrapers/scraper.interface';

const lead = (overrides: Partial<ScrapedLead>): ScrapedLead => ({
  sourceUrl: 'https://example.com/search?q=x',
  scrapedAt: '2026-10-12T00:00:00.000Z',
  ...overrides,
});

describe('dedupeLeads', () => {
  it('drops leads sharing a phone number', () => {
    const { unique, duplicates } = dedupeLeads([
      lead({ name: 'A', phone: '+919000000001', sourceUrl: 'https://maps/a' }),
      lead({ name: 'A branch', phone: '+919000000001', sourceUrl: 'https://maps/b' }),
      lead({ name: 'B', phone: '+919000000002' }),
    ]);
    expect(unique.map((l) => l.name)).toEqual(['A', 'B']);
    expect(duplicates).toBe(1);
  });

  it('keeps distinct phoneless leads that share a search URL', () => {
    const { unique } = dedupeLeads([
      lead({ jobTitle: 'Build a website' }),
      lead({ jobTitle: 'Fix my app' }),
    ]);
    expect(unique).toHaveLength(2);
  });

  it('drops identical phoneless leads, ignoring query string and case', () => {
    const { unique, duplicates } = dedupeLeads([
      lead({ jobTitle: 'Build a website', sourceUrl: 'https://upwork.com/jobs/1?ref=a' }),
      lead({ jobTitle: 'build a website ', sourceUrl: 'https://upwork.com/jobs/1?ref=b' }),
    ]);
    expect(unique).toHaveLength(1);
    expect(duplicates).toBe(1);
  });
});
