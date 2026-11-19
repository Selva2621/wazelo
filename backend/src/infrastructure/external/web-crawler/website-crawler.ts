import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { fetchPublicPage } from '@/common/utils/public-fetch.util';

const USER_AGENT = 'Mozilla/5.0 (compatible; WazeloBot/1.0; +https://wazelo.in)';
/** Pages with less readable text than this are menus/redirect stubs, not knowledge */
const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 60_000;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|css|js|json|xml|zip|rar|mp4|mp3|avi|mov|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i;
const SKIP_PATH = /\/(wp-admin|wp-json|cart|checkout|my-account|login|signin|signup|register|logout|feed|tag|author)(\/|$)/i;

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  /** Called for each page kept, in crawl order */
  onPage?: (page: CrawledPage, progress: { done: number; found: number }) => Promise<void> | void;
  /** Return true to stop early (e.g. job cancelled) */
  shouldStop?: () => boolean | Promise<boolean>;
}

/** Same site: same host, ignoring a leading "www." */
function sameSite(a: URL, b: URL): boolean {
  return a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '');
}

/** Canonical form for de-duplication: no hash, no tracking params, no trailing slash */
export function normalizeUrl(raw: string, base?: URL): URL | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url;
  } catch {
    return null;
  }
}

function crawlable(url: URL, root: URL): boolean {
  return sameSite(url, root) && !SKIP_EXT.test(url.pathname) && !SKIP_PATH.test(url.pathname);
}

/** Readable text + title + same-site links of an HTML page */
export function extractPage(html: string, pageUrl: URL): { title: string; text: string; links: string[] } {
  const $ = cheerio.load(html);
  const links = $('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get();
  const title = ($('title').first().text() || $('h1').first().text() || pageUrl.pathname).replace(/\s+/g, ' ').trim();

  $('script, style, noscript, svg, iframe, form, nav, footer, header, [aria-hidden="true"]').remove();
  // <br> has no content to append to; inline tags would glue words ("for<br>freelancers")
  $('br').replaceWith('\n');
  $('span, a, strong, em, b, i, label, button, small, sup, sub').each((_, el) => {
    $(el).append(' ');
  });
  const root = $('main').length ? $('main') : $('body');
  // Block elements become line breaks so passages keep their structure
  root.find('p, li, h1, h2, h3, h4, h5, h6, tr, div, section, article').each((_, el) => {
    $(el).append('\n');
  });
  const text = root
    .text()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_TEXT_CHARS);
  return { title: title.slice(0, 300), text, links };
}

/** "Disallow" rules for all user agents from robots.txt (best effort) */
async function disallowedPaths(root: URL): Promise<string[]> {
  try {
    const res = await fetchPublicPage(new URL('/robots.txt', root).toString(), {
      userAgent: USER_AGENT,
      contentTypes: ['text/plain'],
      maxBytes: 100_000,
    });
    if (!res) return [];
    const rules: string[] = [];
    let appliesToUs = false;
    for (const raw of res.body.split('\n')) {
      const line = raw.split('#')[0].trim();
      const [field, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (/^user-agent$/i.test(field)) appliesToUs = value === '*' || /wazelo/i.test(value);
      else if (appliesToUs && /^disallow$/i.test(field) && value) rules.push(value);
    }
    return rules;
  } catch {
    return [];
  }
}

/** Page URLs listed in sitemap.xml (and one level of sitemap index) */
async function sitemapUrls(root: URL, limit: number): Promise<string[]> {
  const fetchXml = (url: string) =>
    fetchPublicPage(url, { userAgent: USER_AGENT, contentTypes: ['xml'], maxBytes: 2_000_000 }).catch(() => null);
  const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

  const first = await fetchXml(new URL('/sitemap.xml', root).toString());
  if (!first) return [];
  let urls = locs(first.body);
  if (/<sitemapindex/i.test(first.body)) {
    const nested: string[] = [];
    for (const sm of urls.slice(0, 5)) {
      const res = await fetchXml(sm);
      if (res) nested.push(...locs(res.body));
      if (nested.length >= limit * 3) break;
    }
    urls = nested;
  }
  return urls;
}

/**
 * Reads a business website: sitemap first, then links breadth-first, same site only,
 * honouring robots.txt, skipping duplicates and near-empty pages. SSRF-safe fetches.
 */
export async function crawlWebsite(startUrl: string, options: CrawlOptions = {}): Promise<CrawledPage[]> {
  const maxPages = options.maxPages ?? 30;
  const maxDepth = options.maxDepth ?? 3;
  const root = normalizeUrl(startUrl);
  if (!root) throw new Error('Invalid website URL');

  const disallow = await disallowedPaths(root);
  const allowed = (url: URL) => !disallow.some((rule) => url.pathname.startsWith(rule));

  const queue: { url: URL; depth: number }[] = [{ url: root, depth: 0 }];
  const seen = new Set<string>([root.toString()]);
  for (const raw of await sitemapUrls(root, maxPages)) {
    const url = normalizeUrl(raw);
    if (url && crawlable(url, root) && allowed(url) && !seen.has(url.toString())) {
      seen.add(url.toString());
      queue.push({ url, depth: 1 });
    }
  }

  const pages: CrawledPage[] = [];
  const contentHashes = new Set<string>();
  let attempts = 0;

  while (queue.length && pages.length < maxPages && attempts < maxPages * 3) {
    if (await options.shouldStop?.()) break;
    const { url, depth } = queue.shift()!;
    attempts++;
    let res: Awaited<ReturnType<typeof fetchPublicPage>>;
    try {
      res = await fetchPublicPage(url.toString(), { userAgent: USER_AGENT });
    } catch {
      continue;
    }
    if (!res) continue;

    const { title, text, links } = extractPage(res.body, res.finalUrl);
    if (depth < maxDepth) {
      for (const href of links) {
        const next = normalizeUrl(href, res.finalUrl);
        if (next && crawlable(next, root) && allowed(next) && !seen.has(next.toString())) {
          seen.add(next.toString());
          queue.push({ url: next, depth: depth + 1 });
        }
      }
    }

    if (text.length < MIN_TEXT_CHARS) continue;
    const hash = createHash('sha1').update(text).digest('hex');
    if (contentHashes.has(hash)) continue;
    contentHashes.add(hash);

    const page = { url: res.finalUrl.toString(), title, text };
    pages.push(page);
    await options.onPage?.(page, { done: pages.length, found: Math.min(maxPages, pages.length + queue.length) });
  }
  return pages;
}
