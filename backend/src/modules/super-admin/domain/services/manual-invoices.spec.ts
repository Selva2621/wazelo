import { buildManualInvoice, canSettleInvoice, MAX_MANUAL_LINES } from './manual-invoices';

describe('buildManualInvoice', () => {
  it('totals quantity × unit across lines', () => {
    const r = buildManualInvoice([
      { description: ' Setup fee ', quantity: 1, unitAmountInCents: 500000 },
      { description: 'Extra seats', quantity: 3, unitAmountInCents: 19900 },
    ]);
    expect(r).toEqual({
      ok: true,
      totalInCents: 559700,
      lineItems: [
        { description: 'Setup fee', quantity: 1, unitAmountInCents: 500000, amount: 500000 },
        { description: 'Extra seats', quantity: 3, unitAmountInCents: 19900, amount: 59700 },
      ],
    });
  });

  it('allows a zero-priced line when the total is positive', () => {
    const r = buildManualInvoice([
      { description: 'Onboarding call', quantity: 1, unitAmountInCents: 0 },
      { description: 'Setup', quantity: 1, unitAmountInCents: 100 },
    ]);
    expect(r.ok).toBe(true);
  });

  it('rejects an empty or zero-total invoice', () => {
    expect(buildManualInvoice([]).ok).toBe(false);
    expect(buildManualInvoice([{ description: 'Free', quantity: 1, unitAmountInCents: 0 }]).ok).toBe(false);
  });

  it('rejects bad lines', () => {
    expect(buildManualInvoice([{ description: '  ', quantity: 1, unitAmountInCents: 100 }]).ok).toBe(false);
    expect(buildManualInvoice([{ description: 'x', quantity: 0, unitAmountInCents: 100 }]).ok).toBe(false);
    expect(buildManualInvoice([{ description: 'x', quantity: 1.5, unitAmountInCents: 100 }]).ok).toBe(false);
    expect(buildManualInvoice([{ description: 'x', quantity: 1, unitAmountInCents: -1 }]).ok).toBe(false);
    expect(buildManualInvoice([{ description: 'x', quantity: 1, unitAmountInCents: 10.5 }]).ok).toBe(false);
  });

  it('rejects totals that overflow the integer column', () => {
    expect(buildManualInvoice([{ description: 'x', quantity: 100000, unitAmountInCents: 2_000_000_000 }]).ok).toBe(false);
  });

  it('caps the number of lines', () => {
    const lines = Array.from({ length: MAX_MANUAL_LINES + 1 }, () => ({ description: 'x', quantity: 1, unitAmountInCents: 1 }));
    expect(buildManualInvoice(lines).ok).toBe(false);
  });
});

describe('canSettleInvoice', () => {
  it.each([
    ['OPEN', true],
    ['DRAFT', true],
    ['PAID', false],
    ['VOID', false],
    ['UNCOLLECTIBLE', false],
  ])('%s → %p', (status, expected) => {
    expect(canSettleInvoice(status)).toBe(expected);
  });
});
