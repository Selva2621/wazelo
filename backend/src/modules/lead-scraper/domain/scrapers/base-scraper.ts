import { ScrapedLead } from './scraper.interface';
import { DEFAULT_COUNTRY_CODE } from '@/shared/constants/countries';
import { toE164 } from '@/shared/utils/phone.util';

export abstract class BaseScraper {
  protected async delay(min = 2000, max = 5000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  /** E.164 — numbers without a country code are read as `country`'s (trunk 0 dropped) */
  protected normalizePhone(raw: string, country = DEFAULT_COUNTRY_CODE): string | null {
    return toE164(raw, country);
  }

  /**
   * Rethrow a fetch/parse failure with a readable message, so the run is marked
   * FAILED with a reason instead of COMPLETED with 0 results.
   */
  protected fail(sourceName: string, error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    // Playwright's own text is a multi-line ASCII box — not something to show in the UI
    if (message.includes("Executable doesn't exist")) {
      throw new Error(`${sourceName} scraper browser is not installed on the server — reinstall dependencies and redeploy`);
    }
    const status = (error as { response?: { status?: number } })?.response?.status;
    const detail =
      status === 403 || status === 429
        ? `blocked by ${sourceName} (HTTP ${status}) — try again later`
        : status
          ? `${sourceName} returned HTTP ${status}`
          : `${sourceName} could not be reached: ${message}`;
    throw new Error(detail);
  }

  abstract scrape(
    keywords: string,
    location?: string,
    maxResults?: number,
  ): Promise<ScrapedLead[]>;
}
