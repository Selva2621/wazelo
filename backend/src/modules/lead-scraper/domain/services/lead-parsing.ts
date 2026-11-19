/** Small parsers for the loosely formatted text scraped from listing pages. */
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

/** "3 weeks ago", "a month ago", "Posted 2 hours ago", "yesterday" → approximate date */
export function parseRelativeTime(text: string | null | undefined, now = new Date()): Date | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (/\b(just now|today)\b/.test(t)) return now;
  if (/\byesterday\b/.test(t)) return new Date(now.getTime() - UNIT_MS.day);
  const m = t.match(/\b(a|an|\d+)\s+(minute|hour|day|week|month|year)s?\s+ago\b/);
  if (!m) return undefined;
  const n = m[1] === 'a' || m[1] === 'an' ? 1 : Number(m[1]);
  return new Date(now.getTime() - n * UNIT_MS[m[2]]);
}

/** "Hourly: $15.00-$40.00", "Fixed-price · Est. budget: $500", "₹1,500 - ₹12,500" */
export function parseBudget(text: string | null | undefined): {
  min?: number;
  max?: number;
  type?: 'fixed' | 'hourly';
} {
  if (!text) return {};
  const type = /hourly|\/hr|per hour/i.test(text) ? 'hourly' : /fixed/i.test(text) ? 'fixed' : undefined;
  const numbers = (text.match(/\d[\d,]*(\.\d+)?\s*[kK]?/g) ?? []).map((raw) => {
    const value = parseFloat(raw.replace(/,/g, ''));
    return /k$/i.test(raw.trim()) ? value * 1000 : value;
  });
  if (!numbers.length) return { type };
  return { min: Math.min(...numbers), max: Math.max(...numbers), type };
}

/** Upwork tiers: "Less than 5" → 4, "5 to 10" → 10, "50+" → 50 */
export function parseProposals(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const less = text.match(/less than\s+(\d+)/i);
  if (less) return Number(less[1]) - 1;
  const numbers = text.match(/\d+/g);
  return numbers ? Math.max(...numbers.map(Number)) : undefined;
}

/**
 * Indian mobile numbers are +91 followed by 10 digits starting 6–9; landlines carry
 * an STD code instead. Other countries go by their numbering plan; undefined where
 * the plan can't tell mobiles from landlines (US, Canada).
 */
export function isMobileNumber(phone: string): boolean | undefined {
  if (phone.startsWith('+91')) return /^\+91[6-9]\d{9}$/.test(phone);
  const type = parsePhoneNumberFromString(phone)?.getType();
  if (type === undefined || type === 'FIXED_LINE_OR_MOBILE') return undefined;
  return type === 'MOBILE';
}

/** Google Maps place URLs embed coordinates as !3d<lat>!4d<lng>; search URLs as @lat,lng */
export function coordsFromMapsUrl(url: string): { lat: number; lng: number } | undefined {
  const place = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const view = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = place ?? view;
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : undefined;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Map zoom that roughly frames a circle of this radius */
export function zoomForRadius(km: number): number {
  if (km <= 1) return 15;
  if (km <= 2) return 14;
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 11;
  return 10;
}

/** "Gym, Fitness centre, gym" → ["Gym", "Fitness centre"] — one Maps search per term */
export function splitSearchTerms(keywords: string): string[] {
  const seen = new Set<string>();
  return keywords
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
}

/** "Price: Moderate" / "₹₹" → 1–4 */
export function parsePriceLevel(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const words: Record<string, number> = { inexpensive: 1, moderate: 2, expensive: 3, 'very expensive': 4 };
  const word = text.toLowerCase().match(/price:\s*(very expensive|inexpensive|moderate|expensive)/);
  if (word) return words[word[1]];
  const symbols = text.trim().match(/^[₹$€£]{1,4}$/);
  return symbols ? symbols[0].length : undefined;
}

/** Weekly hours text from Maps, e.g. "Saturday, 6 am to 10 pm; Sunday, Closed; …" */
export function hoursFlags(weekly: string | null | undefined, summary?: string | null) {
  const text = `${weekly ?? ''} ${summary ?? ''}`;
  if (!text.trim()) return { open24h: undefined, openWeekends: undefined };
  const open24h = /open 24 hours/i.test(text) ? true : weekly ? false : undefined;
  if (!weekly) return { open24h, openWeekends: undefined };
  const day = (name: string) => weekly.match(new RegExp(`${name}[^;]*`, 'i'))?.[0];
  const sat = day('Saturday');
  const sun = day('Sunday');
  const openWeekends = sat && sun ? !/closed/i.test(sat) && !/closed/i.test(sun) : undefined;
  return { open24h, openWeekends };
}
