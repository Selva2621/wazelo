import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

export class TruelancerScraper extends BaseScraper {
  async scrape(
    keywords: string,
    _location?: string,
    maxResults = 50,
  ): Promise<ScrapedLead[]> {
    const url = `https://www.truelancer.com/freelance-jobs?q=${encodeURIComponent(keywords)}&page=1`;

    try {
      const response = await axios.get<string>(url, {
        headers: this.getHeaders(),
        timeout: 15_000,
      });

      const $ = cheerio.load(response.data);
      const leads: ScrapedLead[] = [];

      $('.search-result-item').each((_i, el) => {
        if (leads.length >= maxResults) return false;

        const titleEl = $(el).find('.job-title a, h2 a').first();
        const jobTitle = titleEl.text().trim();
        const href = titleEl.attr('href') ?? '';
        const sourceUrl = href.startsWith('http')
          ? href
          : `https://www.truelancer.com${href}`;

        const budget = $(el).find('.job-budget').first().text().trim();

        const skills: string[] = [];
        $(el)
          .find('.skill-tag')
          .each((_j, skillEl) => {
            const skill = $(skillEl).text().trim();
            if (skill) skills.push(skill);
          });

        if (!jobTitle) return;

        leads.push({
          name: 'Truelancer Client',
          jobTitle,
          budget: budget || undefined,
          skills: skills.length > 0 ? skills : undefined,
          sourceUrl,
          scrapedAt: new Date().toISOString(),
        });
      });

      return leads;
    } catch {
      return [];
    }
  }
}
