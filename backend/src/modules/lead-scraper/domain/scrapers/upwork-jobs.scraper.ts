import { chromium } from 'playwright';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

export class UpworkJobsScraper extends BaseScraper {
  async scrape(
    keywords: string,
    location?: string,
    maxResults = 50,
  ): Promise<ScrapedLead[]> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      const searchUrl = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location ?? '')}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // Wait for job tiles
      try {
        await page.waitForSelector('[data-test="job-tile"], section.up-card-section', {
          timeout: 10_000,
        });
      } catch {
        await context.close();
        return [];
      }

      const rawLeads = await page.evaluate(() => {
        const cards =
          document.querySelectorAll('[data-test="job-tile"]').length > 0
            ? document.querySelectorAll('[data-test="job-tile"]')
            : document.querySelectorAll('section.up-card-section');

        const results: Array<{
          jobTitle: string;
          budget: string;
          skills: string[];
          location: string;
        }> = [];

        cards.forEach((card) => {
          const titleEl =
            card.querySelector('h2 a') ||
            card.querySelector('[data-test="job-title"] a') ||
            card.querySelector('h3');
          const jobTitle = titleEl?.textContent?.trim() ?? '';

          const budgetEl =
            card.querySelector('[data-test="budget"]') ||
            card.querySelector('.js-budget') ||
            card.querySelector('[class*="budget"]');
          const budget = budgetEl?.textContent?.trim() ?? '';

          const skillEls = card.querySelectorAll(
            '[data-test="attr-item"], .o-tag, [class*="skill"]',
          );
          const skills: string[] = [];
          skillEls.forEach((s) => {
            const t = s.textContent?.trim();
            if (t) skills.push(t);
          });

          const locEl =
            card.querySelector('[data-test="location"]') ||
            card.querySelector('[class*="location"]');
          const loc = locEl?.textContent?.trim() ?? '';

          if (jobTitle) {
            results.push({ jobTitle, budget, skills, location: loc });
          }
        });

        return results;
      });

      await context.close();

      return rawLeads.slice(0, maxResults).map((r) => ({
        name: 'Upwork Client',
        jobTitle: r.jobTitle,
        budget: r.budget || undefined,
        skills: r.skills.length > 0 ? r.skills : undefined,
        location: r.location || undefined,
        sourceUrl: searchUrl,
        scrapedAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
