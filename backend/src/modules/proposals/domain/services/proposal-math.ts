export interface ProposalItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface ProposalTotals {
  subtotal: number;
  /** Discount actually applied (never more than the subtotal) */
  discount: number;
  tax: number;
  total: number;
}

export const MAX_ITEMS = 50;
const MAX_QUANTITY = 1_000_000;
const MAX_PRICE = 1_000_000_000_000;

/** Money in minor units (paise/cents) so sums and tax never pick up float errors. */
const minor = (n: number) => Math.round(n * 100);

/** Subtotal − discount, then tax on what's left. */
export function computeTotals(items: ProposalItem[], taxPercent: number, discount: number): ProposalTotals {
  const subtotal = items.reduce((sum, i) => sum + Math.round(i.quantity * minor(i.unitPrice)), 0);
  const off = Math.min(Math.max(minor(discount), 0), subtotal);
  const taxable = subtotal - off;
  const tax = Math.round((taxable * Math.max(taxPercent, 0)) / 100);
  return { subtotal: subtotal / 100, discount: off / 100, tax: tax / 100, total: (taxable + tax) / 100 };
}

const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : NaN);

/**
 * Line items from user or AI input: keeps named items with a sane quantity and
 * price (unknown price → 0, for the owner to fill in), at most MAX_ITEMS.
 */
export function cleanItems(raw: unknown): ProposalItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposalItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 200) : '';
    if (!name) continue;
    const q = num(o.quantity);
    const p = num(o.unitPrice);
    const description = typeof o.description === 'string' ? o.description.trim().slice(0, 500) : '';
    out.push({
      name,
      ...(description && { description }),
      quantity: Number.isFinite(q) && q > 0 ? Math.min(Math.round(q * 100) / 100, MAX_QUANTITY) : 1,
      unitPrice: Number.isFinite(p) && p >= 0 ? Math.min(Math.round(p * 100) / 100, MAX_PRICE) : 0,
    });
    if (out.length === MAX_ITEMS) break;
  }
  return out;
}

export function cleanScope(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 30);
}

/** 12 → "P-0012" */
export const proposalNumber = (n: number) => `P-${String(n).padStart(4, '0')}`;

/** Sent or viewed, and past its valid-until date. */
export function isExpired(p: { status: string; validUntil: Date | null }, now = new Date()): boolean {
  return !!p.validUntil && p.validUntil < now && (p.status === 'SENT' || p.status === 'VIEWED');
}
