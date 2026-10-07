import { BillingCycle } from '@prisma/client';

export interface RevenueRow {
  currency: string;
  billingCycle: BillingCycle;
  /** Sum of locked-in subscription prices for this currency + cycle */
  totalCents: number;
  subscriptions: number;
}

export interface CurrencyRevenue {
  currency: string;
  /** Monthly recurring revenue: monthly prices + yearly prices / 12 */
  mrrCents: number;
  arrCents: number;
  payingSubscriptions: number;
}

const MONTHS_PER_CYCLE: Record<BillingCycle, number> = {
  MONTHLY: 1,
  YEARLY: 12,
};

/**
 * Normalise paying subscriptions to MRR/ARR, one entry per currency —
 * amounts in different currencies are never summed together.
 * Sorted by MRR, largest first.
 */
export function computeRevenue(rows: RevenueRow[]): CurrencyRevenue[] {
  const byCurrency = new Map<string, { mrrExact: number; payingSubscriptions: number }>();

  for (const row of rows) {
    const currency = row.currency.toUpperCase();
    const entry = byCurrency.get(currency) ?? { mrrExact: 0, payingSubscriptions: 0 };
    entry.mrrExact += row.totalCents / MONTHS_PER_CYCLE[row.billingCycle];
    entry.payingSubscriptions += row.subscriptions;
    byCurrency.set(currency, entry);
  }

  return [...byCurrency.entries()]
    .map(([currency, { mrrExact, payingSubscriptions }]) => ({
      currency,
      mrrCents: Math.round(mrrExact),
      arrCents: Math.round(mrrExact * 12),
      payingSubscriptions,
    }))
    .sort((a, b) => b.mrrCents - a.mrrCents);
}
