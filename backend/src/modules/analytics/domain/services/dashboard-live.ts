/**
 * Pure logic for the live dashboard cards (no I/O): revenue strip, waiting chats, leads today.
 */

export interface CurrencyRow {
  currency: string;
  count: number;
  value: number;
}

export interface RevenueSummary {
  /** The currency shown; deals in other currencies are left out of the sums */
  currency: string;
  mixedCurrencies: boolean;
  pipelineValue: number;
  openDeals: number;
  wonCount: number;
  wonValue: number;
}

/**
 * Sums open and won deals in one currency: the one most deals use (INR when there are none).
 * Adding rupees to dollars would be wrong, so other currencies are flagged, not added.
 */
export function summarizeRevenue(open: CurrencyRow[], won: CurrencyRow[]): RevenueSummary {
  const counts = new Map<string, number>();
  for (const r of [...open, ...won]) counts.set(r.currency, (counts.get(r.currency) ?? 0) + r.count);
  let currency = 'INR';
  let best = -1;
  for (const [c, n] of counts) {
    if (n > best || (n === best && c === 'INR')) {
      currency = c;
      best = n;
    }
  }
  const pick = (rows: CurrencyRow[]) => rows.find((r) => r.currency === currency);
  return {
    currency,
    mixedCurrencies: counts.size > 1,
    pipelineValue: pick(open)?.value ?? 0,
    openDeals: pick(open)?.count ?? 0,
    wonCount: pick(won)?.count ?? 0,
    wonValue: pick(won)?.value ?? 0,
  };
}

/** Whole minutes a customer has been waiting */
export function waitingMinutes(since: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60_000));
}

/** Where a lead came from, in the words the dashboard shows */
export type LeadOrigin =
  | 'Meta ad'
  | 'Website'
  | 'WhatsApp'
  | 'Instagram'
  | 'Facebook'
  | 'Email'
  | 'Manual'
  | 'Import'
  | 'Lead finder'
  | 'Shopify'
  | 'API';

export function leadOrigin(source: string): LeadOrigin {
  switch (source) {
    case 'FACEBOOK_LEAD_AD':
    case 'INSTAGRAM_LEAD_AD':
    case 'WHATSAPP_LEAD_AD':
      return 'Meta ad';
    case 'WEBSITE':
      return 'Website';
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'INSTAGRAM':
      return 'Instagram';
    case 'FACEBOOK':
      return 'Facebook';
    case 'EMAIL':
      return 'Email';
    case 'IMPORT':
      return 'Import';
    case 'WEB_SCRAPE':
      return 'Lead finder';
    case 'SHOPIFY':
      return 'Shopify';
    case 'API':
      return 'API';
    default:
      return 'Manual';
  }
}
