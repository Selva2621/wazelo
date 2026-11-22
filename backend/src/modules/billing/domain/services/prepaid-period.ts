/**
 * Paying early for the same plan buys future periods without touching the current one
 * (its usage quota keeps running to its end). Every early payment adds ONE period; the
 * count lives on the subscription's `metadata.prepaid`. At each period end the
 * billing-cycle worker starts the next period from the old end and uses one up.
 */
export interface PrepaidPayment {
  paymentId: string;
  invoiceId: string;
  paidAt: string;
}

export interface PrepaidPeriod {
  /** Future periods already paid (> 0 while the marker exists) */
  periods: number;
  /** Payment references, oldest first (last PREPAID_PAYMENTS_KEPT) */
  payments: PrepaidPayment[];
  /** currentPeriodEnd + `periods` cycles (ISO) */
  paidUntil: string;
}

/** How many payment references are kept on the marker */
export const PREPAID_PAYMENTS_KEPT = 24;

type Json = Record<string, unknown>;

function asObject(metadata: unknown): Json {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Json) : {};
}

export function addBillingCycle(from: Date, billingCycle: string, cycles = 1): Date {
  const end = new Date(from);
  if (billingCycle === 'YEARLY') end.setFullYear(end.getFullYear() + cycles);
  else end.setMonth(end.getMonth() + cycles);
  return end;
}

/** The prepaid marker, or null when no future period is paid */
export function readPrepaid(metadata: unknown): PrepaidPeriod | null {
  const p = asObject(metadata).prepaid as Partial<PrepaidPeriod> | undefined;
  if (!p || typeof p !== 'object' || !(Number(p.periods) > 0)) return null;
  return {
    periods: Math.trunc(Number(p.periods)),
    payments: Array.isArray(p.payments) ? p.payments : [],
    paidUntil: String(p.paidUntil ?? ''),
  };
}

/**
 * One more period paid ahead. Returns the new metadata (other keys kept) and the
 * period this payment covers: currentPeriodEnd + n cycles → + n+1 cycles.
 */
export function addPrepaidPeriod(
  metadata: unknown,
  currentPeriodEnd: Date,
  billingCycle: string,
  payment: PrepaidPayment,
): { metadata: Json; coversFrom: Date; coversTo: Date; periods: number } {
  const prev = readPrepaid(metadata);
  const already = prev?.periods ?? 0;
  const periods = already + 1;
  const coversFrom = addBillingCycle(currentPeriodEnd, billingCycle, already);
  const coversTo = addBillingCycle(currentPeriodEnd, billingCycle, periods);
  const prepaid: PrepaidPeriod = {
    periods,
    payments: [...(prev?.payments ?? []), payment].slice(-PREPAID_PAYMENTS_KEPT),
    paidUntil: coversTo.toISOString(),
  };
  return { metadata: { ...asObject(metadata), prepaid }, coversFrom, coversTo, periods };
}

/**
 * A prepaid period has started (new period ends `newPeriodEnd`): one fewer left. The
 * marker is removed at 0; otherwise paidUntil = newPeriodEnd + remaining cycles.
 */
export function consumePrepaidPeriod(metadata: unknown, newPeriodEnd: Date, billingCycle: string): Json {
  const { prepaid: _old, ...rest } = asObject(metadata);
  const prev = readPrepaid(metadata);
  const left = (prev?.periods ?? 0) - 1;
  if (!prev || left <= 0) return rest;
  return {
    ...rest,
    prepaid: {
      periods: left,
      payments: prev.payments,
      paidUntil: addBillingCycle(newPeriodEnd, billingCycle, left).toISOString(),
    } satisfies PrepaidPeriod,
  };
}
