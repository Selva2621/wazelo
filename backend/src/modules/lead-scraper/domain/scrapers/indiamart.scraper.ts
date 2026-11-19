import { Logger } from '@nestjs/common';
import type { Page } from 'playwright';
import { BaseScraper } from './base-scraper';
import { launchBrowser } from './browser';
import { GoogleMapsScraper } from './google-maps.scraper';
import { ScrapedLead, ScrapeOptions } from './scraper.interface';
import { splitSearchTerms } from '../services/lead-parsing';

/** One supplier card as read off an IndiaMART category page */
export interface IndiaMartCard {
  seller: string | null;
  sellerUrl: string | null;
  city: string | null;
  meta: string | null;
  trustSeal: boolean;
  responseRate: string | null;
  rating: string | null;
  reviews: string | null;
  product: string | null;
  productUrl: string | null;
  price: string | null;
}

/**
 * IndiaMART supplier directory. Reads category pages (dir.indiamart.com/<city>/<product>.html):
 * its search page only renders for signed-in browsers. Phone numbers there are IndiaMART's
 * call-forwarding numbers behind an OTP login, so each supplier is looked up on Google Maps
 * for its real phone; the run's website lookup then adds email and WhatsApp.
 */
export class IndiaMartScraper extends BaseScraper {
  private readonly logger = new Logger(IndiaMartScraper.name);

  async scrape(keywords: string, location?: string, maxResults = 50, options?: ScrapeOptions): Promise<ScrapedLead[]> {
    const terms = splitSearchTerms(keywords);
    if (!terms.length) terms.push(keywords.trim());
    const city = citySlug(location);

    let browser;
    try {
      browser = await launchBrowser(options?.signal);
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        locale: 'en-IN',
      });
      const page = await context.newPage();
      const mapsPage = await (
        await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          locale: 'en-US',
        })
      ).newPage();
      const maps = new GoogleMapsScraper();

      const leads: ScrapedLead[] = [];
      const seen = new Set<string>();
      const missing: string[] = [];
      for (const term of terms) {
        if (leads.length >= maxResults || options?.signal?.aborted) break;
        const cards = await this.categoryCards(page, term, city);
        if (!cards) {
          missing.push(term);
          continue;
        }
        for (const card of cards) {
          if (leads.length >= maxResults || options?.signal?.aborted) break;
          const lead = cardToLead(card, term);
          const key = lead?.name?.toLowerCase();
          if (!lead || !key || seen.has(key)) continue;
          seen.add(key);
          await this.fillFromMaps(maps, mapsPage, lead, options?.country);
          if (!options?.accept || (await options.accept(lead))) leads.push(lead);
        }
        await this.delay(1200, 2000);
      }
      if (!leads.length && missing.length) {
        throw new Error(
          `no IndiaMART category for ${missing.map((t) => `"${t}"`).join(', ')}${city ? ` in ${location}` : ''} — ` +
            'use a product name as IndiaMART lists it, e.g. "LED lights", "cotton t-shirts", "gym equipments"',
        );
      }
      if (missing.length) this.logger.warn(`IndiaMART: no category page for ${missing.join(', ')}`);
      return leads;
    } catch (error) {
      return this.fail('IndiaMART', error);
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  /**
   * IndiaMART hides phones behind a login, so find the supplier on Google Maps by name and
   * city and take its phone, address and (when IndiaMART gave none) website. Best effort.
   */
  private async fillFromMaps(maps: GoogleMapsScraper, page: Page, lead: ScrapedLead, country?: string): Promise<void> {
    try {
      const place = await maps.findBusiness(page, lead.name!, lead.location, country);
      if (!place) return;
      lead.phone = place.phone;
      lead.address = place.address;
      lead.website ??= place.website;
      lead.lat = place.lat;
      lead.lng = place.lng;
      lead.closed = place.closed;
      if (place.socialLinks?.length) lead.socialLinks = place.socialLinks;
      lead.mapsUrl = place.sourceUrl;
    } catch (error) {
      this.logger.warn(`Maps lookup failed for ${lead.name}: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
    }
  }

  /** Cards from the first slug variant IndiaMART has a page for, or null when none exists */
  private async categoryCards(page: Page, term: string, city?: string): Promise<IndiaMartCard[] | null> {
    for (const slug of slugVariants(term)) {
      const url = city
        ? `https://dir.indiamart.com/${city}/${slug}.html`
        : `https://dir.indiamart.com/impcat/${slug}.html`;
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (!res || res.status() === 404) continue;
      if (res.status() >= 400) throw Object.assign(new Error(`HTTP ${res.status()}`), { response: { status: res.status() } });
      await page.waitForSelector('article.template7-product-card', { timeout: 10_000 }).catch(() => undefined);
      // Cards render as the page scrolls
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 5000);
        await this.delay(600, 900);
      }
      const cards = await page.evaluate(readCards);
      if (cards.length) return cards;
    }
    return null;
  }
}

/** Runs in the page: every supplier card's visible fields */
function readCards(): IndiaMartCard[] {
  const txt = (el: Element | null) => (el as HTMLElement | null)?.innerText?.trim() || null;
  return Array.from(document.querySelectorAll('article.template7-product-card')).map((card) => {
    const seller = card.querySelector('a.template7-seller-name') as HTMLAnchorElement | null;
    const product = card.querySelector('a.template7-product-name') as HTMLAnchorElement | null;
    const bold = card.querySelector('.trstelems .b');
    return {
      seller: txt(seller),
      sellerUrl: seller?.href ?? null,
      city: txt(card.querySelector('[itemprop="addressLocality"]')),
      meta: txt(card.querySelector('.seller-addr-msn')),
      trustSeal: !!card.querySelector('.trustseal-pill'),
      responseRate: txt(card.querySelector('.response-rate-text')),
      rating: txt(bold),
      reviews: txt(bold?.nextElementSibling ?? null),
      product: txt(product),
      productUrl: product?.href ?? null,
      price: txt(card.querySelector('.template7-price-row')),
    };
  });
}

/** A card as a lead; a seller link off IndiaMART is the supplier's own website */
export function cardToLead(card: IndiaMartCard, term: string): ScrapedLead | null {
  const name = card.seller?.trim();
  if (!name) return null;
  const ownSite = card.sellerUrl && !/(^|\.)indiamart\.com$/i.test(safeHost(card.sellerUrl)) ? card.sellerUrl : undefined;
  const years = card.meta?.match(/(\d+)\s*yrs?/i);
  const rate = card.responseRate?.match(/(\d+)\s*%/);
  const rating = card.rating ? parseFloat(card.rating) : NaN;
  const reviews = card.reviews?.match(/\d[\d,]*/);
  return {
    name,
    company: name,
    website: ownSite,
    location: card.city ?? undefined,
    category: term,
    product: card.product ?? undefined,
    budget: card.price?.replace(/\s+/g, ' ') ?? undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    reviewCount: reviews ? parseInt(reviews[0].replace(/,/g, ''), 10) : undefined,
    yearsListed: years ? parseInt(years[1], 10) : undefined,
    trustSeal: card.trustSeal,
    responseRate: rate ? parseInt(rate[1], 10) : undefined,
    socialLinks: [],
    // The supplier's IndiaMART page when it has no site of its own, else the product it was found by
    sourceUrl: (ownSite ? card.productUrl : card.sellerUrl) ?? card.productUrl ?? card.sellerUrl ?? 'https://dir.indiamart.com/',
    scrapedAt: new Date().toISOString(),
  };
}

/** "LED Lights" → ["led-lights", "led-light"]; IndiaMART slugs are hit-or-miss on plurals */
export function slugVariants(term: string): string[] {
  const slug = term.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) return [];
  return [...new Set([slug, slug.endsWith('s') ? slug.slice(0, -1) : `${slug}s`])];
}

/** "Mumbai, India" → "mumbai"; "New Delhi" → "new-delhi"; "India" → none (all India) */
export function citySlug(location?: string): string | undefined {
  const city = location?.split(',')[0]?.trim().toLowerCase();
  if (!city || /^(india|all india|pan india)$/.test(city)) return undefined;
  return city.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || undefined;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
