import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Fetching URLs that users give us (their website, a lead's website) without
 * letting them point the server at internal addresses (SSRF): every hop of a
 * redirect is resolved and must be a public IP, with timeouts and size caps.
 */

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

/** Throws unless the URL is http(s) and every address its host resolves to is public. */
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicIp(a.address))) {
    throw new Error('non-public address');
  }
}

export interface PublicFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
  /** Accepted content types (substring match); a response of any other type yields null */
  contentTypes?: string[];
}

const DEFAULTS: Required<PublicFetchOptions> = {
  timeoutMs: 8_000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
  userAgent: 'Mozilla/5.0 (compatible; WazeloBot/1.0)',
  contentTypes: ['text/html'],
};

/**
 * GET a page from the public internet only, following a few redirects with
 * re-validation. Null for non-2xx, an unexpected content type, or too many redirects.
 */
export async function fetchPublicPage(
  startUrl: string,
  options: PublicFetchOptions = {},
): Promise<{ body: string; finalUrl: URL; contentType: string } | null> {
  const opts = { ...DEFAULTS, ...options };
  let url = new URL(startUrl);
  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(opts.timeoutMs),
      headers: { 'User-Agent': opts.userAgent, Accept: opts.contentTypes.join(', ') },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !opts.contentTypes.some((t) => contentType.includes(t))) return null;
    const body = await res.text();
    return { body: body.slice(0, opts.maxBytes), finalUrl: url, contentType };
  }
  return null;
}
