import type { Metadata } from "next";

// Single source of truth for page-level SEO. Every route builds its metadata
// through `pageMetadata` so canonicals, Open Graph and Twitter cards stay
// consistent. (A child segment's `openGraph` *replaces* the parent's, so
// siteName/locale must be repeated on every page — this helper does that.)

export const SITE_URL = "https://wazelo.in";
export const SITE_NAME = "Wazelo";
export const SITE_LOCALE = "en_US";
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

export const absoluteUrl = (path = "/") =>
  path === "/" ? SITE_URL : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

interface PageSeo {
  /** Route path, e.g. "/features/lead-ads". Used for the canonical and og:url. */
  path: string;
  /** Page title without the brand; the root template appends " | Wazelo". */
  title: string;
  /** 120–160 characters, written for the searcher. */
  description: string;
  /** Use the full string as-is (no template). For the homepage. */
  absoluteTitle?: boolean;
  /** Social image path; defaults to the generated root OG image. */
  image?: { url: string; alt: string };
  noindex?: boolean;
}

export function pageMetadata({ path, title, description, absoluteTitle, image, noindex }: PageSeo): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const img = image ?? { url: "/opengraph-image", alt: `${SITE_NAME} — every lead, followed up` };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url,
      title: socialTitle,
      description,
      images: [{ url: img.url, width: 1200, height: 630, alt: img.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [img.url],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// ── JSON-LD builders ───────────────────────────────────────────────────────────

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  // Feature pages sit under the /features hub: Home > Features > Lead ads.
  const parent = trail[0]?.path.startsWith("/features/") ? [{ name: "Features", path: "/features" }] : [];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...parent, ...trail].map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

/** WebPage node tied to the site/organization graph. */
export function webPageJsonLd({ path, title, description }: { path: string; title: string; description: string }) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": SOFTWARE_ID },
    publisher: { "@id": ORG_ID },
  };
}
