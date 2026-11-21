import { fetchPublicPage as fetchPublicUrl } from '@/common/utils/public-fetch.util';
import { WebsiteSignals } from './scraper.interface';

export { isPublicIp } from '@/common/utils/public-fetch.util';

const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us'];

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

/** Contact details read from a business website */
export interface WebsiteContacts {
  site?: WebsiteSignals;
  email?: string;
  /** Raw phone numbers from tel: links, page order */
  phones: string[];
  /** Numbers from wa.me / api.whatsapp.com click-to-chat links, "+<digits>" */
  whatsapp: string[];
  /** Instagram, Facebook, LinkedIn, YouTube, X profile links */
  socialLinks: string[];
}

/** Pages besides the home page to read, at most — contact/about pages linked from it */
const MAX_EXTRA_PAGES = 2;

/**
 * Fetch a business website: return its marketing signals and contact details — email,
 * tel: numbers, WhatsApp click-to-chat numbers and social profiles. Reads the home page,
 * then up to two contact/about pages it links to (common paths when it links none).
 * Unreachable sites return no signals — filters treat that as unknown.
 */
export async function inspectWebsite(website: string, opts: { findEmail: boolean }): Promise<WebsiteContacts> {
  const contacts: WebsiteContacts = { phones: [], whatsapp: [], socialLinks: [] };
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return contacts;
  }
  const emails: string[] = [];
  const read = (html: string) => {
    if (opts.findEmail) emails.push(...extractEmails(html, base.hostname));
    const found = extractContacts(html);
    contacts.phones.push(...found.phones);
    contacts.whatsapp.push(...found.whatsapp);
    contacts.socialLinks.push(...found.socialLinks);
  };

  let extra = CONTACT_PATHS.slice(1).map((p) => new URL(p, base.origin).toString());
  try {
    const home = await fetchPublicPage(base.toString());
    if (home) {
      contacts.site = websiteSignals(home.html, home.finalUrl);
      read(home.html);
      const linked = contactPageLinks(home.html, home.finalUrl);
      if (linked.length) extra = linked;
    }
  } catch {
    // unreachable, blocked or non-public
  }

  for (const url of extra.slice(0, MAX_EXTRA_PAGES)) {
    // Nothing left worth another request
    if ((emails.length || !opts.findEmail) && contacts.whatsapp.length && contacts.phones.length) break;
    try {
      const html = await fetchPublicHtml(url);
      if (html) read(html);
    } catch {
      // unreachable — try the next page
    }
  }

  contacts.email = sortOwnDomainFirst([...new Set(emails)], base.hostname)[0];
  contacts.phones = [...new Set(contacts.phones)];
  contacts.whatsapp = [...new Set(contacts.whatsapp)];
  contacts.socialLinks = [...new Set(contacts.socialLinks)].slice(0, 6);
  return contacts;
}

const SOCIAL_RE =
  /^https?:\/\/(?:[a-z]+\.)?(?:instagram\.com|facebook\.com|fb\.com|linkedin\.com|youtube\.com|twitter\.com|x\.com)\/[^\s"'<>]+/i;
/** Share buttons, plugins and platform pages — not the business's own profile */
const SOCIAL_JUNK_RE = /\/(?:sharer|share|intent|plugins|dialog|tr|embed|hashtag|policies|privacy|help|watch)\b/i;

/** Numbers and profiles a page links to: tel:, WhatsApp click-to-chat and social links */
export function extractContacts(html: string): Pick<WebsiteContacts, 'phones' | 'whatsapp' | 'socialLinks'> {
  const phones: string[] = [];
  const whatsapp: string[] = [];
  const socialLinks: string[] = [];
  for (const [, rawHref] of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = decodeEntities(rawHref.trim());
    const tel = href.match(/^tel:\s*([+\d][\d\s().-]{5,})/i);
    if (tel) {
      phones.push(tel[1].replace(/[^\d+]/g, ''));
      continue;
    }
    const wa =
      href.match(/^https?:\/\/wa\.me\/\+?(\d{8,15})/i) ??
      href.match(/^(?:https?:\/\/(?:api\.|web\.)?whatsapp\.com\/send\/?|whatsapp:\/\/send)\?(?:.*&)?phone=\+?(\d{8,15})/i);
    if (wa) {
      whatsapp.push(`+${wa[1]}`);
      continue;
    }
    const social = href.match(SOCIAL_RE)?.[0];
    if (social && !SOCIAL_JUNK_RE.test(social)) socialLinks.push(social.replace(/[?#].*$/, '').replace(/\/$/, ''));
  }
  return { phones, whatsapp, socialLinks };
}

/** A path segment that is a contact/about page ("contact-us.html", "/about/"), not "power-contactors" */
const CONTACT_LINK_RE = /(?:^|[/_-])(?:contact|about|reach|enquiry|get-in-touch)(?:-?us)?(?:\.[a-z]+)?\/?$/i;

/** Same-site contact/about pages a page links to, contact pages first */
export function contactPageLinks(html: string, pageUrl: URL): string[] {
  const host = pageUrl.hostname.replace(/^www\./, '');
  const links = new Set<string>();
  for (const [, rawHref] of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(decodeEntities(rawHref.trim()), pageUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, '') !== host) continue;
    if (!CONTACT_LINK_RE.test(url.pathname) || /\.(?:pdf|jpe?g|png|zip)$/i.test(url.pathname)) continue;
    if (url.toString() !== pageUrl.toString()) links.add(url.toString());
  }
  return [...links].sort((a, b) => Number(/contact/i.test(b)) - Number(/contact/i.test(a)));
}

function sortOwnDomainFirst(emails: string[], siteHost: string): string[] {
  const host = siteHost.replace(/^www\./, '');
  return emails.sort((a, b) => Number(b.endsWith(`@${host}`)) - Number(a.endsWith(`@${host}`)));
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&#x2F;|&#47;/gi, '/').replace(/&#43;|&#x2B;/gi, '+');
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
