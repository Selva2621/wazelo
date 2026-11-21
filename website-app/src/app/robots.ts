import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Never block /_next/: Google needs those JS/CSS chunks to render the pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
