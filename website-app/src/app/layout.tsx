import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LenisProvider from "./lenis-provider";
import { JsonLd } from "@/components/json-ld";
import { ORG_ID, SITE_LOCALE, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/seo";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

const WIDGET_SRC = process.env.NEXT_PUBLIC_WAZELO_WIDGET_SRC;

// ── Site-wide structured data (one linked graph) ───────────────────────────────
// Page-specific schema (SoftwareApplication, FAQPage, BreadcrumbList, WebPage)
// lives on the page it describes, never here.

const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo/logo.png`,
        width: 512,
        height: 512,
      },
      email: "hello@wazelo.in",
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "hello@wazelo.in",
          contactType: "customer support",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
        {
          "@type": "ContactPoint",
          email: "sales@wazelo.in",
          contactType: "sales",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en",
      publisher: { "@id": ORG_ID },
    },
  ],
};

// ── Root metadata (defaults; every page sets its own canonical via pageMetadata) ──

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: "WhatsApp CRM & Lead Follow-up Platform | Wazelo",
  },
  description:
    "Wazelo catches leads from Meta ads, your website and WhatsApp, replies in seconds with AI and follows up until they buy. 14-day free trial.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/logo/wazelo-mark-small.svg", type: "image/svg+xml" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee6" },
    { media: "(prefers-color-scheme: dark)", color: "#110e0c" },
  ],
};

// ── Root Layout ────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Light by default; a visitor who picked dark gets it before the first paint. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{document.documentElement.dataset.theme=localStorage.getItem("wazelo-theme")==="dark"?"dark":"light"}catch(e){}`}
        </Script>
        {/* Text fonts are self-hosted via next/font. The icon font loads only on the
            routes that use it (components/icon-font.tsx). */}
        <JsonLd data={siteGraph} />
      </head>
      <body className="font-sans">
        <LenisProvider>
          {children}
        </LenisProvider>
        {/* Wazelo's own website chat (set NEXT_PUBLIC_WAZELO_WIDGET_SRC to the embed.js link
            from Settings → Chat widget in the Wazelo workspace; unset = no widget) */}
        {WIDGET_SRC && <Script src={WIDGET_SRC} strategy="lazyOnload" />}
      </body>
    </html>
  );
}
