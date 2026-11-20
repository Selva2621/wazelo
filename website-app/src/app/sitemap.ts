import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { indexablePosts } from "@/components/blog/posts";

// `lastModified` must reflect a real content change. Using `new Date()` tells
// crawlers every page changed on every deploy, so they learn to ignore it.
// Bump a route's date when its content actually changes.
// (Google ignores `priority` and `changeFrequency`, so they are omitted.)
const ROUTES: [path: string, lastModified: string][] = [
  ["/", "2026-11-20"],
  ["/pricing", "2026-11-20"],

  // Feature pages
  ["/features", "2026-11-20"],
  ["/features/lead-ads", "2026-11-20"],
  ["/features/ai-assistant", "2026-11-20"],
  ["/features/website-chat", "2026-11-20"],
  ["/features/shared-inbox", "2026-11-20"],
  ["/features/multi-channel", "2026-11-20"],
  ["/features/sequences", "2026-11-20"],
  ["/features/automation", "2026-11-20"],
  ["/features/campaigns", "2026-11-20"],
  ["/features/chatbot", "2026-11-20"],
  ["/features/lead-finder", "2026-11-20"],
  ["/features/proposals", "2026-11-20"],
  ["/features/deals", "2026-11-20"],
  ["/features/lead-scoring", "2026-11-20"],
  ["/features/contacts", "2026-11-20"],
  ["/features/analytics", "2026-11-20"],
  ["/features/csat", "2026-11-20"],
  ["/features/mobile-app", "2026-11-20"],
  ["/features/developer-api", "2026-11-20"],

  // Comparisons
  ["/compare", "2026-11-20"],
  ["/compare/wati", "2026-11-20"],
  ["/compare/interakt", "2026-11-20"],
  ["/compare/aisensy", "2026-11-20"],

  // Content + company
  ["/use-cases", "2026-11-20"],
  ["/use-cases/real-estate", "2026-11-20"],
  ["/use-cases/agencies", "2026-11-20"],
  ["/use-cases/freelancers", "2026-11-20"],
  ["/about", "2026-11-20"],
  ["/security", "2026-11-20"],
  ["/docs", "2026-11-20"],
  ["/api-reference", "2026-11-20"],
  ["/contact", "2026-11-20"],
  ["/privacy", "2026-11-20"],
  ["/terms", "2026-11-20"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Blog posts with screenshot placeholders are noindex, so they stay out until finished.
  const blog: [string, string][] = [["/blog", "2026-11-21"], ...indexablePosts().map((p): [string, string] => [`/blog/${p.slug}`, p.updated])];
  return [...ROUTES, ...blog].map(([path, lastModified]) => ({
    url: absoluteUrl(path),
    lastModified: new Date(lastModified),
  }));
}
