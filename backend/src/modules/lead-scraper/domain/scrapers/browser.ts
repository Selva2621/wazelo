import './playwright-env';
import { Browser, chromium } from 'playwright';

/** Headless Chromium for scrapers — import this instead of 'playwright' so the browser path is set first. */
export function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });
}
