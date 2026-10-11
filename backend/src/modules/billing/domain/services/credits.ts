/**
 * Account credit rules. Pure logic, no I/O. All amounts are integer minor units
 * (paise/cents) in ONE currency — callers never mix currencies.
 */

export const CREDIT_LINE_DESCRIPTION = 'Account credit';

export type CreditCheck = { ok: true } | { ok: false; reason: string };

export interface InvoiceLine {
  description: string;
  amount: number;
  quantity: number;
  [key: string]: unknown;
}

const CURRENCY = /^[A-Z]{3}$/;

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY.test(value);
}

function isPositiveInt(n: number): boolean {
  return Number.isSafeInteger(n) && n > 0;
}

/** A grant must be a positive integer amount in a valid currency. */
export function checkCreditGrant(amountInCents: number, currency: string): CreditCheck {
  if (!isCurrencyCode(currency)) return { ok: false, reason: 'Currency must be a 3-letter code' };
  if (!isPositiveInt(amountInCents)) return { ok: false, reason: 'Credit amount must be a positive amount' };
  return { ok: true };
}

/** A revoke may take back at most the remaining balance in that currency. */
export function checkCreditRevoke(balanceInCents: number, amountInCents: number, currency: string): CreditCheck {
  if (!isCurrencyCode(currency)) return { ok: false, reason: 'Currency must be a 3-letter code' };
  if (!isPositiveInt(amountInCents)) return { ok: false, reason: 'Revoke amount must be a positive amount' };
  if (amountInCents > balanceInCents) {
    return {
      ok: false,
      reason: `Revoke exceeds the available ${currency} credit (${Math.max(balanceInCents, 0)} remaining in minor units)`,
    };
  }
  return { ok: true };
}

/**
 * How much credit to apply against an amount due: min(balance, due), never negative.
 * Returns the applied credit and what is left to charge.
 */
export function applyCredit(balanceInCents: number, amountDueInCents: number): { appliedInCents: number; remainderInCents: number } {
  const due = Math.max(Math.trunc(amountDueInCents), 0);
  const balance = Math.max(Math.trunc(balanceInCents), 0);
  const appliedInCents = Math.min(balance, due);
  return { appliedInCents, remainderInCents: due - appliedInCents };
}

/** Adds a negative "Account credit" line when credit was applied. */
export function withCreditLine(lines: InvoiceLine[], appliedInCents: number): InvoiceLine[] {
  if (appliedInCents <= 0) return lines;
  return [...lines, { description: CREDIT_LINE_DESCRIPTION, amount: -appliedInCents, quantity: 1 }];
}

/** Sum of signed ledger amounts per currency. */
export function balancesByCurrency(entries: { currency: string; amountInCents: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.currency] = (out[e.currency] ?? 0) + e.amountInCents;
  return out;
}
