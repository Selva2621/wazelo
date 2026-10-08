export interface MonthCount {
  /** 'YYYY-MM' (UTC) */
  month: string;
  count: number;
}

export interface MonthRevenue {
  month: string;
  currency: string;
  amountCents: number;
}

export interface GrowthPoint {
  month: string;
  newOrgs: number;
  newPaying: number;
  churned: number;
  /** Payments collected, per currency — never summed across currencies */
  revenue: Record<string, number>;
}

/** The last `months` calendar months (UTC) as 'YYYY-MM', oldest first, including the current one. */
export function lastMonths(months: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** First instant of the oldest month in the window — the SQL lower bound. */
export function windowStart(months: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

/** Merge sparse SQL rows into a dense series: every month present, missing ones as zero. */
export function buildGrowthSeries(
  monthKeys: string[],
  rows: { newOrgs: MonthCount[]; newPaying: MonthCount[]; churned: MonthCount[]; revenue: MonthRevenue[] },
): GrowthPoint[] {
  const byMonth = new Map<string, GrowthPoint>(
    monthKeys.map((month) => [month, { month, newOrgs: 0, newPaying: 0, churned: 0, revenue: {} }]),
  );
  for (const r of rows.newOrgs) { const p = byMonth.get(r.month); if (p) p.newOrgs += r.count; }
  for (const r of rows.newPaying) { const p = byMonth.get(r.month); if (p) p.newPaying += r.count; }
  for (const r of rows.churned) { const p = byMonth.get(r.month); if (p) p.churned += r.count; }
  for (const r of rows.revenue) {
    const p = byMonth.get(r.month);
    if (!p) continue;
    const currency = r.currency.toUpperCase();
    p.revenue[currency] = (p.revenue[currency] ?? 0) + r.amountCents;
  }
  return monthKeys.map((m) => byMonth.get(m)!);
}
