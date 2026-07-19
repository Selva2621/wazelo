import { ScrapedLead } from './scraper.interface';

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

  protected normalizePhone(raw: string, defaultCountryCode = '91'): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7) return null;

    // Already E.164 (has + prefix)
    if (hasPlus) return `+${digits}`;

    // Indian trunk prefix: 0XXXXXXXXXX (11 digits starting with 0) → +91XXXXXXXXXX
    if (digits.length === 11 && digits.startsWith('0')) {
      return `+${defaultCountryCode}${digits.slice(1)}`;
    }

    // 10-digit number without trunk prefix → +91XXXXXXXXXX
    if (digits.length === 10) {
      return `+${defaultCountryCode}${digits}`;
    }

    // Already has country code digits (e.g. 919876543210 = 12 digits)
    if (digits.length > 10) return `+${digits}`;

    return `+${defaultCountryCode}${digits}`;
  }

  abstract scrape(
    keywords: string,
    location?: string,
    maxResults?: number,
  ): Promise<ScrapedLead[]>;
}
