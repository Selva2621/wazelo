import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

export class LinkedInJobsScraper extends BaseScraper {
  async scrape(
    keywords: string,
    location?: string,
    maxResults = 75,
  ): Promise<ScrapedLead[]> {
    const leads: ScrapedLead[] = [];
    const pages = [0, 25, 50];

    for (const start of pages) {
      if (leads.length >= maxResults) break;

      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location ?? '')}&start=${start}`;

      try {
        const response = await axios.get<string>(url, {
          headers: {
            ...this.getHeaders(),
            Referer: 'https://www.linkedin.com/',
          },
          timeout: 15_000,
        });

        const $ = cheerio.load(response.data);
        const items = $('li');

        if (items.length < 1) break;

        items.each((_i, el) => {
          if (leads.length >= maxResults) return false;

          const jobTitle = $(el)
            .find('h3.base-search-card__title')
            .first()
            .text()
            .trim();
          const company = $(el)
            .find('h4.base-search-card__subtitle')
            .first()
            .text()
            .trim();
          const loc = $(el)
            .find('.job-search-card__location')
            .first()
            .text()
            .trim();
          const jobUrl =
            $(el).find('a.base-card__full-link').first().attr('href') ?? '';

          if (!jobTitle) return;

          leads.push({
            name: company || 'LinkedIn Client',
            jobTitle,
            company: company || undefined,
            location: loc || undefined,
            sourceUrl: jobUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}`,
            scrapedAt: new Date().toISOString(),
          });
        });

        // Stop early if fewer than 25 results returned
        if (items.length < 25) break;

        if (start < 50) {
          await this.delay(2000, 2000);
        }
      } catch {
        break;
      }
    }

    return leads;
  }
}
