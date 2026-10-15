/** Manual (super admin) invoice rules. Pure logic, no I/O. Amounts are integer minor units. */

export interface ManualLineInput {
  description: string;
  quantity: number;
  unitAmountInCents: number;
}

export interface ManualLine {
  description: string;
  quantity: number;
  unitAmountInCents: number;
  /** Line total (quantity × unit) — the `amount` every invoice line carries */
  amount: number;
}

export const MAX_MANUAL_LINES = 50;

export type ManualInvoiceBuild =
  | { ok: true; lineItems: ManualLine[]; totalInCents: number }
  | { ok: false; reason: string };

/** Validates the lines and totals them. The total must be positive and a safe integer. */
export function buildManualInvoice(items: ManualLineInput[]): ManualInvoiceBuild {
  if (!items.length) return { ok: false, reason: 'Add at least one line item' };
  if (items.length > MAX_MANUAL_LINES) return { ok: false, reason: `At most ${MAX_MANUAL_LINES} line items` };
  const lineItems: ManualLine[] = [];
  let total = 0;
  for (const item of items) {
    const description = (item.description ?? '').trim();
    if (!description) return { ok: false, reason: 'Every line item needs a description' };
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, reason: 'Quantity must be a whole number of at least 1' };
    }
    if (!Number.isInteger(item.unitAmountInCents) || item.unitAmountInCents < 0) {
      return { ok: false, reason: 'Unit amount must be zero or a positive amount' };
    }
    const amount = item.quantity * item.unitAmountInCents;
    total += amount;
    if (!Number.isSafeInteger(amount) || total > 2_147_483_647) {
      return { ok: false, reason: 'Invoice total is too large' };
    }
    lineItems.push({ description, quantity: item.quantity, unitAmountInCents: item.unitAmountInCents, amount });
  }
  if (total <= 0) return { ok: false, reason: 'Invoice total must be greater than zero' };
  return { ok: true, lineItems, totalInCents: total };
}

/** Only unpaid, unvoided invoices can be marked paid or voided. */
export function canSettleInvoice(status: string): boolean {
  return status === 'OPEN' || status === 'DRAFT';
}
