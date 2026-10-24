// Same browser folder as the lead scraper (node_modules/playwright-core/.local-browsers); must load before 'playwright'
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';

import { chromium } from 'playwright';

let running = 0;
const queue: (() => void)[] = [];
const MAX_PARALLEL = 2;

/** At most two Chromium renders at once, so a burst of downloads can't exhaust memory. */
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => queue.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

/**
 * A self-contained HTML page (inline CSS, no external requests) → A4 PDF.
 * Network access is blocked so the document can never fetch anything.
 */
export function htmlToPdf(html: string): Promise<Buffer> {
  return slot(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();
      await page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));
      await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  });
}
