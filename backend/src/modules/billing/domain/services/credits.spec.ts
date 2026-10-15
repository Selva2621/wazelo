import {
  applyCredit,
  balancesByCurrency,
  checkCreditGrant,
  checkCreditRevoke,
  CREDIT_LINE_DESCRIPTION,
  withCreditLine,
} from './credits';

describe('applyCredit', () => {
  it('applies the whole balance when it is less than the amount due', () => {
    expect(applyCredit(300, 1000)).toEqual({ appliedInCents: 300, remainderInCents: 700 });
  });

  it('covers the whole amount when the balance is larger, leaving 0 to charge', () => {
    expect(applyCredit(5000, 1000)).toEqual({ appliedInCents: 1000, remainderInCents: 0 });
  });

  it('applies exactly when balance equals the amount', () => {
    expect(applyCredit(1000, 1000)).toEqual({ appliedInCents: 1000, remainderInCents: 0 });
  });

  it('applies nothing for a zero or negative balance', () => {
    expect(applyCredit(0, 1000)).toEqual({ appliedInCents: 0, remainderInCents: 1000 });
    expect(applyCredit(-200, 1000)).toEqual({ appliedInCents: 0, remainderInCents: 1000 });
  });

  it('never goes below zero for a zero amount due', () => {
    expect(applyCredit(500, 0)).toEqual({ appliedInCents: 0, remainderInCents: 0 });
  });
});

describe('withCreditLine', () => {
  const plan = { description: 'Pro plan - monthly', amount: 1000, quantity: 1 };

  it('adds a negative Account credit line', () => {
    expect(withCreditLine([plan], 300)).toEqual([
      plan,
      { description: CREDIT_LINE_DESCRIPTION, amount: -300, quantity: 1 },
    ]);
  });

  it('leaves the lines alone when nothing was applied', () => {
    expect(withCreditLine([plan], 0)).toEqual([plan]);
  });

  it('line amounts sum to the amount still due', () => {
    const lines = withCreditLine([plan], 300);
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(700);
  });
});

describe('checkCreditGrant', () => {
  it('accepts a positive integer in a 3-letter currency', () => {
    expect(checkCreditGrant(500, 'INR')).toEqual({ ok: true });
  });

  it.each([0, -5, 1.5, NaN])('rejects amount %p', (amount) => {
    expect(checkCreditGrant(amount, 'INR').ok).toBe(false);
  });

  it.each(['inr', 'RUPEE', '', 'US'])('rejects currency %p', (currency) => {
    expect(checkCreditGrant(100, currency).ok).toBe(false);
  });
});

describe('checkCreditRevoke', () => {
  it('allows revoking up to the balance', () => {
    expect(checkCreditRevoke(1000, 1000, 'USD')).toEqual({ ok: true });
    expect(checkCreditRevoke(1000, 1, 'USD')).toEqual({ ok: true });
  });

  it('refuses more than the remaining balance', () => {
    const r = checkCreditRevoke(1000, 1001, 'USD');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('1000');
  });

  it('refuses any revoke on an empty balance', () => {
    expect(checkCreditRevoke(0, 1, 'USD').ok).toBe(false);
  });

  it('refuses non-positive amounts', () => {
    expect(checkCreditRevoke(1000, 0, 'USD').ok).toBe(false);
  });
});

describe('balancesByCurrency', () => {
  it('sums signed entries per currency without mixing currencies', () => {
    expect(
      balancesByCurrency([
        { currency: 'INR', amountInCents: 1000 },
        { currency: 'INR', amountInCents: -300 },
        { currency: 'USD', amountInCents: 500 },
        { currency: 'INR', amountInCents: -200 },
      ]),
    ).toEqual({ INR: 500, USD: 500 });
  });
});
