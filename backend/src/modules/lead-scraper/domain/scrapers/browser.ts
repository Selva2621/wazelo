import './playwright-env';
import { Browser, chromium } from 'playwright';

/**
 * Headless Chromium for scrapers — import this instead of 'playwright' so the browser path is set first.
 * Aborting `signal` closes the browser, which makes any pending page call throw right away.
 */
export async function launchBrowser(signal?: AbortSignal): Promise<Browser> {
  signal?.throwIfAborted();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });
  const close = () => void browser.close().catch(() => undefined);
  if (signal?.aborted) close();
  else signal?.addEventListener('abort', close, { once: true });
  return browser;
}
