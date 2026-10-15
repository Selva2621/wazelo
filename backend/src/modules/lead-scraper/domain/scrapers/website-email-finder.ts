import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { WebsiteSignals } from './scraper.interface';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const CONTACT_PATHS = ['', '/contact', '/contact-us'];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
// Asset filenames and tracker/builder addresses that look like emails
const JUNK_EMAIL_RE = /\.(png|jpe?g|gif|svg|webp|css|js)$|@(example\.|sentry|wixpress|.*\.wix\.com|domain\.com|email\.com)/i;

/** Block loopback, private, link-local (cloud metadata) and other non-public ranges. */
export function isPublicIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a >= 224) return false; // multicast + reserved
    return true;
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return false;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return false;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    return true;
  }
  return false;
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicIp(a.address))) {
    throw new Error('non-public address');
  }
}

/** GET a page from the public internet only, following a few redirects with re-validation. */
async function fetchPublicHtml(startUrl: string): Promise<string | null> {
  return (await fetchPublicPage(startUrl))?.html ?? null;
}

async function fetchPublicPage(startUrl: string): Promise<{ html: string; finalUrl: URL } | null> {
  let url = new URL(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WazeloLeadBot/1.0)', Accept: 'text/html' },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;
    const body = await res.text();
    return { html: body.slice(0, MAX_BYTES), finalUrl: url };
  }
  return null;
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
