/** One day of platform message volume. Pure logic, no I/O. */
export interface DailyUsage {
  /** YYYY-MM-DD, UTC */
  date: string;
  outbound: number;
  inbound: number;
  /** Outbound messages that ended FAILED */
  failed: number;
}

export interface DayDirectionRow {
  day: string;
  direction: 'INBOUND' | 'OUTBOUND';
  total: number;
  failed: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC start of the day `days - 1` days before `now` — the window covers `days` whole days. */
export function usageWindowStart(days: number, now = new Date()): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (days - 1) * DAY_MS);
}

/** One entry per day in the window, oldest first; days with no messages are zeros. */
export function buildDailyUsage(rows: DayDirectionRow[], days: number, now = new Date()): DailyUsage[] {
  const start = usageWindowStart(days, now).getTime();
  const byDay = new Map<string, DailyUsage>();
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    byDay.set(date, { date, outbound: 0, inbound: 0, failed: 0 });
  }
  for (const r of rows) {
    const d = byDay.get(r.day);
    if (!d) continue;
    if (r.direction === 'OUTBOUND') {
      d.outbound += r.total;
      d.failed += r.failed;
    } else {
      d.inbound += r.total;
    }
  }
  return [...byDay.values()];
}
