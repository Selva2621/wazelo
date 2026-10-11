import { searchTerm } from './search-term';

describe('searchTerm', () => {
  it('trims and keeps a real term', () => {
    expect(searchTerm('  acme  ')).toBe('acme');
  });

  it('treats empty, blank and missing as no search', () => {
    expect(searchTerm('')).toBeUndefined();
    expect(searchTerm('   ')).toBeUndefined();
    expect(searchTerm(undefined)).toBeUndefined();
    expect(searchTerm(null)).toBeUndefined();
  });

  it('caps very long input at 100 characters', () => {
    expect(searchTerm('x'.repeat(500))).toHaveLength(100);
  });
});
