import type { Page } from 'playwright';
import { BaseScraper } from './base-scraper';
import { launchBrowser } from './browser';
import { ScrapedLead, ScrapeOptions } from './scraper.interface';
import {
  coordsFromMapsUrl,
  distanceKm,
  parsePriceLevel,
  parseRelativeTime,
  splitSearchTerms,
  zoomForRadius,
} from '../services/lead-parsing';

/** With a filter, visit extra places so enough survive it — bounded to keep runs reasonable. */
const FILTER_OVERSCAN = 3;
const MAX_EXTRA_CANDIDATES = 100;
const MAX_SCROLLS = 40;

type Coords = { lat: number; lng: number };

export class GoogleMapsScraper extends BaseScraper {
  async scrape(
    keywords: string,
    location?: string,
    maxResults = 50,
    options?: ScrapeOptions,
  ): Promise<ScrapedLead[]> {
    const accept = options?.accept;
    const candidateLimit = accept
      ? Math.min(maxResults * FILTER_OVERSCAN, maxResults + MAX_EXTRA_CANDIDATES)
      : maxResults;
    let browser;
    try {
      browser = await launchBrowser(options?.signal);

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
      });
      const page = await context.newPage();

      // Radius search: find the centre of `location`, then search around it
      const center = options?.radiusKm && location ? await this.locate(page, location) : undefined;
      const searchUrls = this.searchUrls(keywords, location, options, center);

      const placeUrls: string[] = [];
      const seen = new Set<string>();
      for (const [i, url] of searchUrls.entries()) {
        if (placeUrls.length >= candidateLimit || options?.signal?.aborted) break;
        // Share what's left across the remaining searches so the first type/area can't take it all
        const budget = Math.ceil((candidateLimit - placeUrls.length) / (searchUrls.length - i));
        const found = await this.collectPlaceUrls(page, url, budget, seen);
        for (const placeUrl of found) {
          // Skip places outside the radius before spending time on their page
          const coords = coordsFromMapsUrl(placeUrl);
          if (center && options?.radiusKm && coords && distanceKm(center, coords) > options.radiusKm) continue;
          placeUrls.push(placeUrl);
        }
      }

      const results: ScrapedLead[] = [];
      for (const placeUrl of placeUrls) {
        if (results.length >= maxResults || options?.signal?.aborted) break;
        try {
          const lead = await this.scrapePlace(page, placeUrl, !!options?.collectLastReview, options?.country);
          if (!accept || (await accept(lead))) results.push(lead);
        } catch {
          // Skip failed detail pages
        }
      }

      await context.close();
      return results;
    } catch (error) {
      return this.fail('Google Maps', error);
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  private searchUrls(keywords: string, location: string | undefined, options?: ScrapeOptions, center?: Coords): string[] {
    const search = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
    const terms = splitSearchTerms(keywords);
    if (!terms.length) terms.push(keywords.trim());
    const areas = options?.areas?.map((a) => a.trim()).filter(Boolean) ?? [];
    if (areas.length) return terms.flatMap((term) => areas.map((area) => search(`${term} ${area}`)));
    if (center && options?.radiusKm) {
      const at = `/@${center.lat},${center.lng},${zoomForRadius(options.radiusKm)}z`;
      return terms.map((term) => `${search(term)}${at}`);
    }
    return terms.map((term) => search(`${term} ${location ?? ''}`.trim()));
  }

  /** Resolve a place name to coordinates by letting Maps centre on it */
  private async locate(page: Page, location: string): Promise<Coords | undefined> {
    try {
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(location)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForURL(/@-?\d+\.\d+,-?\d+\.\d+/, { timeout: 10_000 });
      return coordsFromMapsUrl(page.url());
    } catch {
      return undefined;
    }
  }

  /** Open a search and scroll its result list until enough new places, the end, or no growth */
  private async collectPlaceUrls(page: Page, searchUrl: string, limit: number, seen: Set<string>): Promise<string[]> {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    try {
      await page.waitForSelector('div[role="feed"]', { timeout: 10_000 });
    } catch {
      return [];
    }

    let lastCount = 0;
    let stalls = 0;
    for (let i = 0; i < MAX_SCROLLS; i++) {
      const { count, ended } = await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop = feed.scrollHeight;
        const hrefs = new Set(
          Array.from(document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]'))
            .map((a) => (a.getAttribute('href') ?? '').split('?')[0]),
        );
        // Google renders "You've reached the end of the list." at the bottom
        const ended = !!feed?.textContent?.includes('reached the end of the list');
        return { count: hrefs.size, ended };
      });
      if (count >= limit + seen.size || ended) break;
      stalls = count === lastCount ? stalls + 1 : 0;
      if (stalls >= 3) break;
      lastCount = count;
      await this.delay(1200, 1800);
    }

    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]')).map(
        (a) => a.getAttribute('href') ?? '',
      ),
    );
    const urls: string[] = [];
    for (const href of hrefs) {
      if (urls.length >= limit) break;
      const url = href.startsWith('http') ? href : `https://www.google.com${href}`;
      const key = url.split('?')[0];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      urls.push(url);
    }
    return urls;
  }

  private async scrapePlace(
    page: Page,
    placeUrl: string,
    collectLastReview: boolean,
    country?: string,
  ): Promise<ScrapedLead> {
    await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForSelector('h1', { timeout: 8_000 }).catch(() => {});
    await this.delay(800, 1200);

    const detail = await page.evaluate(() => {
      const text = (sel: string) =>
        (document.querySelector(sel) as HTMLElement | null)?.textContent?.trim() ?? null;
      const mainText = (document.querySelector('div[role="main"]') as HTMLElement | null)?.innerText ?? '';

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

      // Opening hours — today's summary, plus the full week when the table is present
      const hoursEl = document.querySelector('[aria-label*="Hours"] span') ??
        document.querySelector('span[aria-label*="open"]') ??
        document.querySelector('[data-item-id="oh"] span');
      const openingHours = (hoursEl as HTMLElement | null)?.textContent?.trim() ?? null;
      const weekLabel = document.querySelector('[aria-label*="Monday"][aria-label*="Sunday"]')?.getAttribute('aria-label');
      const weekRows = Array.from(document.querySelectorAll('table tr'))
        .map((tr) => (tr as HTMLElement).innerText.replace(/\s+/g, ' ').trim())
        .filter((t) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(t));
      const weeklyHours = weekLabel ?? (weekRows.length ? weekRows.join('; ') : null);

      // Social links
      const socialAnchors = Array.from(document.querySelectorAll('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'));
      const socialLinks = [...new Set(socialAnchors.map((a) => (a as HTMLAnchorElement).href))].slice(0, 5);

      // Closed listings show a "Permanently closed" / "Temporarily closed" banner
      const closed = /(Permanently|Temporarily) closed/i.test(mainText);

      // Unclaimed listings invite the owner to "Claim this business"
      const claimed = !/Claim this business/i.test(mainText);

      // Photo count, when Maps shows one ("123 photos", "Photos (123)")
      const labels = Array.from(document.querySelectorAll('button, [aria-label]'))
        .map((el) => `${el.getAttribute('aria-label') ?? ''} ${(el as HTMLElement).innerText ?? ''}`)
        .join(' \n ');
      const photoMatch = labels.match(/([\d,]+)\+?\s+photos?\b/i) ?? labels.match(/photos?\s*\(([\d,]+)\)/i);
      const photoCount = photoMatch ? parseInt(photoMatch[1].replace(/,/g, ''), 10) : null;

      // Price level: "Price: Moderate" label or a bare "₹₹"
      const priceLabel = document.querySelector('[aria-label^="Price"]')?.getAttribute('aria-label') ??
        Array.from(document.querySelectorAll('span'))
          .map((s) => s.textContent?.trim() ?? '')
          .find((t) => /^[₹$€£]{1,4}$/.test(t)) ?? null;

      return {
        name, category, address, phone, website, rating, reviewCount, description,
        openingHours, weeklyHours, socialLinks, closed, claimed, photoCount, priceLabel,
      };
    });

    // Normalize phone to E.164 (strips tel: prefix and trunk 0, adds the country code)
    const cleanPhone = detail.phone
      ? this.normalizePhone(detail.phone.replace(/^tel:/i, '').trim(), country) ?? undefined
      : undefined;

    // Strip leading map-pin icon characters (non-ASCII garbage before the address)
    const cleanAddress = detail.address
      ? detail.address.replace(/^[^\w\d(]+/, '').trim()
      : undefined;

    const coords = coordsFromMapsUrl(placeUrl);
    const lastReviewAt = collectLastReview ? await this.newestReviewDate(page) : undefined;

    return {
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
      weeklyHours: detail.weeklyHours ?? undefined,
      socialLinks: detail.socialLinks ?? [],
      closed: detail.closed,
      claimed: detail.claimed,
      photoCount: detail.photoCount ?? undefined,
      priceLevel: parsePriceLevel(detail.priceLabel),
      lat: coords?.lat,
      lng: coords?.lng,
      lastReviewAt: lastReviewAt?.toISOString(),
      sourceUrl: placeUrl,
      scrapedAt: new Date().toISOString(),
    };
  }

  /** Open the Reviews tab sorted by newest and read the first review's age. Best effort. */
  private async newestReviewDate(page: Page): Promise<Date | undefined> {
    try {
      await page.locator('button[role="tab"][aria-label*="Reviews"]').first().click({ timeout: 3_000 });
      await this.delay(1000, 1500);
      await page.locator('button[aria-label*="Sort reviews"], button[data-value="Sort"]').first().click({ timeout: 3_000 });
      await page.locator('[role="menuitemradio"]', { hasText: 'Newest' }).first().click({ timeout: 3_000 });
      await this.delay(1200, 1800);
      const age = await page.evaluate(() => {
        const re = /\b(a|an|\d+)\s+(minute|hour|day|week|month|year)s?\s+ago\b/i;
        const span = Array.from(document.querySelectorAll('div[role="main"] span')).find((s) =>
          re.test(s.textContent ?? ''),
        );
        return span?.textContent ?? null;
      });
      return parseRelativeTime(age);
    } catch {
      return undefined;
    }
  }
}
