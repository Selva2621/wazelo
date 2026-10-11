/** Rules for recording refunds against a payment. Pure logic, no I/O. */

export type RefundCheck =
  | { ok: true; fullyRefunded: boolean; remainingAfter: number }
  | { ok: false; reason: string };

/**
 * Can `amount` be recorded against a payment of `paid` that already has `refunded`?
 * Only succeeded (or partly refunded) payments qualify; the total may never exceed `paid`.
 */
export function checkRefund(status: string, paid: number, refunded: number, amount: number): RefundCheck {
  if (status !== 'SUCCEEDED') {
    return { ok: false, reason: status === 'REFUNDED' ? 'This payment is already fully refunded' : 'Only succeeded payments can be refunded' };
  }
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'Refund amount must be a positive amount' };
  const remaining = paid - refunded;
  if (amount > remaining) {
    return { ok: false, reason: `Refund exceeds the refundable amount (${remaining} remaining in minor units)` };
  }
  return { ok: true, fullyRefunded: amount === remaining, remainingAfter: remaining - amount };
}
