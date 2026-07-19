import { chromium } from 'playwright';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

export class GoogleMapsScraper extends BaseScraper {
  async scrape(keywords: string, location?: string, maxResults = 50): Promise<ScrapedLead[]> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      const query = `${keywords} ${location ?? ''}`.trim();
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for results feed
      try {
        await page.waitForSelector('div[role="feed"]', { timeout: 10_000 });
      } catch {
        await context.close();
        return [];
      }

      // Scroll to load more results
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollTop = feed.scrollHeight;
        });
        await this.delay(1500, 1500);
      }

      // Collect place URLs from the list
      const placeUrls: string[] = await page.evaluate((limit: number) => {
        const anchors = Array.from(document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]'));
        const seen = new Set<string>();
        const urls: string[] = [];
        for (const a of anchors) {
          if (urls.length >= limit) break;
          const href = a.getAttribute('href') ?? '';
          // Normalise to full URL, deduplicate by place path
          const url = href.startsWith('http') ? href : `https://www.google.com${href}`;
          const key = url.split('?')[0];
          if (!key || seen.has(key)) continue;
          seen.add(key);
          urls.push(url);
        }
        return urls;
      }, maxResults);

      const results: ScrapedLead[] = [];

      // Visit each place detail page
      for (const placeUrl of placeUrls) {
        try {
          await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
          await page.waitForSelector('h1', { timeout: 8_000 }).catch(() => {});
          await this.delay(800, 1200);

          const detail = await page.evaluate(() => {
            const text = (sel: string) =>
              (document.querySelector(sel) as HTMLElement | null)?.textContent?.trim() ?? null;

            // Name
            const name = text('h1') ?? text('[data-attrid="title"]');

            // Category (e.g. "Gym", "Restaurant")
            const categoryEl = document.querySelector('button[jsaction*="category"]') ??
              document.querySelector('[data-attrid="kc:/location/location:business_type"] span');
            const category = (categoryEl as HTMLElement | null)?.textContent?.trim() ?? null;

            // Address
            const addressEl = document.querySelector('[data-item-id="address"]') ??
              document.querySelector('button[data-item-id*="address"]');
            const address = (addressEl as HTMLElement | null)?.textContent?.trim() ?? null;

            // Phone
            const phoneEl = document.querySelector('[data-item-id^="phone:"]');
            const phone = phoneEl?.getAttribute('data-item-id')?.replace('phone:', '') ?? null;

            // Website
            const websiteEl = document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement | null;
            const website = websiteEl?.href ?? null;

            // Rating
            const ratingEl = document.querySelector('[aria-label*="stars"], span[aria-label*="star"]');
            const ratingText = ratingEl?.getAttribute('aria-label') ?? '';
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

            // Review count
            const reviewEl = document.querySelector('button[jsaction*="reviewChart"]') ??
              document.querySelector('[aria-label*="review"]');
            const reviewText = (reviewEl as HTMLElement | null)?.textContent?.trim() ?? '';
            const reviewMatch = reviewText.match(/[\d,]+/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[0].replace(/,/g, ''), 10) : null;

            // Description
            const descriptionEl = document.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_about"] div') ??
              document.querySelector('div[aria-label*="About"] p') ??
              document.querySelector('span[jsl*="description"]');
            const description = (descriptionEl as HTMLElement | null)?.textContent?.trim()?.slice(0, 500) ?? null;

            // Opening hours
            const hoursEl = document.querySelector('[aria-label*="Hours"] span') ??
              document.querySelector('span[aria-label*="open"]') ??
              document.querySelector('[data-item-id="oh"] span');
            const openingHours = (hoursEl as HTMLElement | null)?.textContent?.trim() ?? null;

            // Social links
            const socialAnchors = Array.from(document.querySelectorAll('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'));
            const socialLinks = [...new Set(socialAnchors.map((a) => (a as HTMLAnchorElement).href))].slice(0, 5);

            return { name, category, address, phone, website, rating, reviewCount, description, openingHours, socialLinks };
          });

          // Normalize phone to E.164 (strips tel: prefix, trunk 0, adds +91)
          const cleanPhone = detail.phone
            ? this.normalizePhone(detail.phone.replace(/^tel:/i, '').trim()) ?? undefined
            : undefined;

          // Strip leading map-pin icon characters (non-ASCII garbage before the address)
          const cleanAddress = detail.address
            ? detail.address.replace(/^[^\w\d(]+/, '').trim()
            : undefined;

          results.push({
            name: detail.name ?? undefined,
            phone: cleanPhone || undefined,
            website: detail.website ?? undefined,
            location: cleanAddress || undefined,
            address: cleanAddress || undefined,
            rating: detail.rating ?? undefined,
            reviewCount: detail.reviewCount ?? undefined,
            category: detail.category ?? undefined,
            description: detail.description ?? undefined,
            openingHours: detail.openingHours ?? undefined,
            socialLinks: detail.socialLinks ?? [],
            sourceUrl: placeUrl,
            scrapedAt: new Date().toISOString(),
          });
        } catch {
          // Skip failed detail pages
        }
      }

      await context.close();
      return results;
    } catch {
      return [];
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }
}
