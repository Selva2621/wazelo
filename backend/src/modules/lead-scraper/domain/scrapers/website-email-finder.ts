import { fetchPublicPage as fetchPublicUrl } from '@/common/utils/public-fetch.util';
import { WebsiteSignals } from './scraper.interface';

export { isPublicIp } from '@/common/utils/public-fetch.util';

const CONTACT_PATHS = ['', '/contact', '/contact-us'];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
// Asset filenames and tracker/builder addresses that look like emails
const JUNK_EMAIL_RE = /\.(png|jpe?g|gif|svg|webp|css|js)$|@(example\.|sentry|wixpress|.*\.wix\.com|domain\.com|email\.com)/i;

const LEAD_BOT_UA = 'Mozilla/5.0 (compatible; WazeloLeadBot/1.0)';

/** A public web page's HTML (SSRF-safe, see public-fetch.util) */
async function fetchPublicPage(startUrl: string): Promise<{ html: string; finalUrl: URL } | null> {
  const page = await fetchPublicUrl(startUrl, { userAgent: LEAD_BOT_UA });
  return page ? { html: page.body, finalUrl: page.finalUrl } : null;
}

async function fetchPublicHtml(startUrl: string): Promise<string | null> {
  return (await fetchPublicPage(startUrl))?.html ?? null;
}

/** Marketing basics an agency would pitch on, read from a home page */
export function websiteSignals(html: string, finalUrl: URL): WebsiteSignals {
  return {
    https: finalUrl.protocol === 'https:',
    mobileFriendly: /<meta[^>]+name=["']?viewport/i.test(html),
    hasPixel: /fbq\(|connect\.facebook\.net\/[^"']*fbevents/i.test(html),
    hasAnalytics: /gtag\(|googletagmanager\.com|google-analytics\.com|ga\(\s*['"]create/i.test(html),
  };
}

/**
 * Fetch a business website once: return its marketing signals and, when asked, a
 * contact email (home page first, then common contact pages). Unreachable sites
 * return no signals — filters treat that as unknown.
 */
export async function inspectWebsite(
  website: string,
  opts: { findEmail: boolean },
): Promise<{ site?: WebsiteSignals; email?: string }> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return {};
  }
  let site: WebsiteSignals | undefined;
  let email: string | undefined;
  try {
    const home = await fetchPublicPage(base.toString());
    if (home) {
      site = websiteSignals(home.html, home.finalUrl);
      if (opts.findEmail) email = extractEmails(home.html, base.hostname)[0];
    }
  } catch {
    // unreachable, blocked or non-public
  }
  if (opts.findEmail && !email) email = (await findEmailOnWebsite(website, CONTACT_PATHS.slice(1))) ?? undefined;
  return { site, email };
}

export function extractEmails(html: string, siteHost?: string): string[] {
  const found = new Set<string>();
  for (const raw of html.match(EMAIL_RE) ?? []) {
    const email = raw.toLowerCase().replace(/^\.+|\.+$/g, '');
    if (!JUNK_EMAIL_RE.test(email)) found.add(email);
  }
  // Prefer addresses on the business's own domain
  const host = siteHost?.replace(/^www\./, '');
  const own = (e: string) => Number(!!host && e.endsWith(`@${host}`));
  return [...found].sort((a, b) => own(b) - own(a));
}

/**
 * Look for a contact email on a business website: home page first, then common
 * contact pages. Returns null when nothing usable is found or the site is unreachable.
 */
export async function findEmailOnWebsite(website: string, paths = CONTACT_PATHS): Promise<string | null> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return null;
  }
  for (const path of paths) {
    try {
      const html = await fetchPublicHtml(path ? new URL(path, base.origin).toString() : base.toString());
      if (!html) continue;
      const [email] = extractEmails(html, base.hostname);
      if (email) return email;
    } catch {
      // unreachable, blocked or non-public — try the next path
    }
  }
  return null;
}
