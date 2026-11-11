/**
 * A brand's day-end lead summary, and the org-time-zone clock it runs on. Pure.
 */

export interface SummaryLead {
  contactName: string | null;
  contactPhone: string;
  productName: string | null;
  assigneeName: string | null;
  dueAt: Date;
  touchedAt: Date | null;
}

export interface DailySummary {
  total: number;
  contacted: number;
  /** Contacted before their reminder time */
  onTime: number;
  byProduct: Array<{ name: string; count: number }>;
  /** Still waiting, in the caller's order */
  notContacted: Array<{ who: string; product: string | null; assignee: string | null }>;
}

export function buildDailySummary(leads: SummaryLead[]): DailySummary {
  const byProduct = new Map<string, number>();
  let contacted = 0;
  let onTime = 0;
  const notContacted: DailySummary['notContacted'] = [];
  for (const l of leads) {
    const product = l.productName ?? 'Other';
    byProduct.set(product, (byProduct.get(product) ?? 0) + 1);
    if (l.touchedAt) {
      contacted++;
      if (l.touchedAt.getTime() <= l.dueAt.getTime()) onTime++;
    } else {
      notContacted.push({ who: l.contactName || l.contactPhone, product: l.productName, assignee: l.assigneeName });
    }
  }
  return {
    total: leads.length,
    contacted,
    onTime,
    byProduct: [...byProduct.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    notContacted,
  };
}

/** One notification: a title and a short body (lists capped so it stays readable) */
export function formatDailySummary(brand: string, s: DailySummary): { title: string; body: string } {
  const products = s.byProduct.map((p) => `${p.name} ${p.count}`).join(', ');
  const waiting = s.notContacted.length
    ? ` Not contacted ${s.notContacted.length}: ${s.notContacted
        .slice(0, 5)
        .map((n) => `${n.who}${n.assignee ? ` (${n.assignee})` : ''}`)
        .join(', ')}${s.notContacted.length > 5 ? ` +${s.notContacted.length - 5} more` : ''}.`
    : ' Every lead was contacted.';
  return {
    title: `${brand}: ${s.total} lead${s.total === 1 ? '' : 's'} today`,
    body: `${products}. Contacted ${s.contacted} (${s.onTime} on time).${waiting}`,
  };
}

/** The org's local date (YYYY-MM-DD), hour, and when that local day began */
export function localDay(now: Date, timeZone: string): { date: string; hour: number; startOfDay: Date } {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
  } catch {
    if (timeZone === 'UTC') throw new Error('Intl time zones unavailable');
    return localDay(now, 'UTC');
  }
  const hour = Number(parts.hour);
  const sinceMidnightMs = ((hour * 60 + Number(parts.minute)) * 60 + Number(parts.second)) * 1000 + now.getMilliseconds();
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    startOfDay: new Date(now.getTime() - sinceMidnightMs),
  };
}
