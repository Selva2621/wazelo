import { cleanItems, cleanScope, computeTotals, isExpired, proposalNumber } from './proposal-math';

describe('computeTotals', () => {
  it('adds items, takes the discount off, then adds tax', () => {
    const items = [
      { name: 'Website', quantity: 1, unitPrice: 25000 },
      { name: 'Logo', quantity: 2, unitPrice: 2500 },
    ];
    expect(computeTotals(items, 18, 1000)).toEqual({ subtotal: 30000, discount: 1000, tax: 5220, total: 34220 });
  });

  it('avoids float errors', () => {
    expect(computeTotals([{ name: 'x', quantity: 3, unitPrice: 0.1 }], 0, 0).total).toBe(0.3);
    expect(computeTotals([{ name: 'x', quantity: 1, unitPrice: 99.99 }], 18, 0)).toEqual({ subtotal: 99.99, discount: 0, tax: 18, total: 117.99 });
  });

  it('never discounts below zero and ignores negative tax', () => {
    expect(computeTotals([{ name: 'x', quantity: 1, unitPrice: 500 }], -5, 9000)).toEqual({ subtotal: 500, discount: 500, tax: 0, total: 0 });
  });

  it('is zero with no items', () => {
    expect(computeTotals([], 18, 0)).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  });
});

describe('cleanItems', () => {
  it('keeps named items and fixes bad numbers', () => {
    expect(
      cleanItems([
        { name: ' Website ', quantity: '2', unitPrice: '25,000' },
        { name: 'Hosting', quantity: -1, unitPrice: 'ask' },
        { name: '', quantity: 1, unitPrice: 5 },
        'junk',
        null,
      ]),
    ).toEqual([
      { name: 'Website', quantity: 2, unitPrice: 25000 },
      { name: 'Hosting', quantity: 1, unitPrice: 0 },
    ]);
  });

  it('caps the number of items', () => {
    expect(cleanItems(Array.from({ length: 80 }, (_, i) => ({ name: `i${i}`, quantity: 1, unitPrice: 1 })))).toHaveLength(50);
  });

  it('returns [] for non-arrays', () => {
    expect(cleanItems({ name: 'x' })).toEqual([]);
  });
});

describe('cleanScope', () => {
  it('keeps non-empty strings', () => {
    expect(cleanScope([' 5 pages ', '', 3, 'SEO basics'])).toEqual(['5 pages', 'SEO basics']);
  });
});

describe('proposalNumber / isExpired', () => {
  it('formats numbers', () => {
    expect(proposalNumber(12)).toBe('P-0012');
    expect(proposalNumber(12345)).toBe('P-12345');
  });

  it('only sent/viewed proposals past their date are expired', () => {
    const past = new Date('2026-01-01');
    expect(isExpired({ status: 'SENT', validUntil: past })).toBe(true);
    expect(isExpired({ status: 'VIEWED', validUntil: past })).toBe(true);
    expect(isExpired({ status: 'ACCEPTED', validUntil: past })).toBe(false);
    expect(isExpired({ status: 'SENT', validUntil: null })).toBe(false);
    expect(isExpired({ status: 'SENT', validUntil: new Date(Date.now() + 86_400_000) })).toBe(false);
  });
});
