import { ScrapedLead } from '../scrapers/scraper.interface';

/**
 * Drop duplicate leads within one scrape. Leads with a phone are keyed by phone;
 * others by source URL + identifying fields (a shared search URL alone is not unique).
 */
export function dedupeLeads(leads: ScrapedLead[]): { unique: ScrapedLead[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: ScrapedLead[] = [];

  for (const lead of leads) {
    const key = lead.phone
      ? `phone:${lead.phone}`
      : [lead.sourceUrl.split('?')[0], lead.name, lead.jobTitle, lead.address]
          .map((v) => (v ?? '').trim().toLowerCase())
          .join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(lead);
  }

  return { unique, duplicates: leads.length - unique.length };
}
