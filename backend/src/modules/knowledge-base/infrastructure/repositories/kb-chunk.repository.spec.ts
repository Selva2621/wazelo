import { toTsQuery, toTsQueryAll } from './kb-chunk.repository';

describe('toTsQuery', () => {
  it('ORs meaningful words, prefix-matching only words of 4+ letters', () => {
    expect(toTsQuery('Do you deliver to Anna Nagar?')).toBe('deliver:* | anna:* | nagar:*');
    expect(toTsQuery('price of the pro plan')).toBe('price:* | pro | plan:*');
  });

  it('keeps non-Latin scripts and numbers, de-duplicated', () => {
    expect(toTsQuery('கேக் விலை 500 கேக்')).toBe('கேக்:* | விலை:* | 500');
  });

  it('strips tsquery operators users might type', () => {
    expect(toTsQuery("price & delivery | (cake) ! 'x'")).toBe('price:* | delivery:* | cake:*');
  });

  it('builds the AND form for ranking', () => {
    expect(toTsQueryAll('price of the pro plan')).toBe('price:* & pro & plan:*');
  });

  it('returns null when only stopwords remain', () => {
    expect(toTsQuery('what is the')).toBeNull();
    expect(toTsQuery('   ')).toBeNull();
  });
});
