import { BaseScraper } from './base-scraper';
import { launchBrowser } from './browser';
import { ScrapedLead } from './scraper.interface';
import { parseBudget, parseProposals, parseRelativeTime } from '../services/lead-parsing';

export class UpworkJobsScraper extends BaseScraper {
  async scrape(
    keywords: string,
    location?: string,
    maxResults = 50,
  ): Promise<ScrapedLead[]> {
    let browser;
    try {
      browser = await launchBrowser();

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
          jobUrl: string;
          budget: string;
          jobType: string;
          skills: string[];
          location: string;
          posted: string;
          paymentVerified: boolean | null;
          proposals: string;
        }> = [];
        const textOf = (card: Element, selectors: string) =>
          (card.querySelector(selectors) as HTMLElement | null)?.textContent?.trim() ?? '';

        cards.forEach((card) => {
          const titleEl =
            card.querySelector('h2 a') ||
            card.querySelector('[data-test="job-title"] a') ||
            card.querySelector('h3');
          const jobTitle = titleEl?.textContent?.trim() ?? '';
          const href = titleEl?.getAttribute('href') ?? '';
          const jobUrl = href ? new URL(href, 'https://www.upwork.com').toString() : '';

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

          const jobType = textOf(card, '[data-test="job-type-label"], [data-test="job-type"]');
          const posted = textOf(card, '[data-test="job-pubilshed-date"], [data-test="job-published-date"], [data-test="posted-on"]');
          const proposals = textOf(card, '[data-test="proposals-tier"], [data-test="proposals"]');
          // Upwork marks verified clients; when the badge area renders but says unverified, it's false
          const paymentText = textOf(card, '[data-test="payment-verified"], [data-test="payment-verification-status"]');
          const paymentVerified = paymentText ? !/unverified|not verified/i.test(paymentText) : null;

          if (jobTitle) {
            results.push({ jobTitle, jobUrl, budget, jobType, skills, location: loc, posted, paymentVerified, proposals });
          }
        });

        return results;
      });

      await context.close();

      return rawLeads.slice(0, maxResults).map((r): ScrapedLead => {
        const budget = parseBudget(`${r.jobType} ${r.budget}`);
        return {
          name: 'Upwork Client',
          jobTitle: r.jobTitle,
          budget: [r.jobType, r.budget].filter(Boolean).join(' · ') || undefined,
          budgetMin: budget.min,
          budgetMax: budget.max,
          budgetType: budget.type,
          skills: r.skills.length > 0 ? r.skills : undefined,
          location: r.location || undefined,
          clientCountry: r.location || undefined,
          postedAt: parseRelativeTime(r.posted)?.toISOString(),
          paymentVerified: r.paymentVerified ?? undefined,
          proposals: parseProposals(r.proposals),
          sourceUrl: r.jobUrl || searchUrl,
          scrapedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      return this.fail('Upwork', error);
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
