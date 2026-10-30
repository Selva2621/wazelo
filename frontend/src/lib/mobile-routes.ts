import { allNavItems } from "@/components/layout/nav-config";

/**
 * Route knowledge for the iOS-style mobile shell: which tab a page belongs to,
 * its title, where "Back" goes when there is no history, and which pages get
 * a large title (top-level lists) vs a compact one (detail screens).
 */

export type MobileTabId = "home" | "inbox" | "contacts" | "more";

const TAB_PREFIXES: [MobileTabId, string[]][] = [
  ["home", ["/dashboard"]],
  ["inbox", ["/inbox"]],
  ["contacts", ["/contacts"]],
];

/** Pages opened from the top bar (bell), not from a tab: no tab is highlighted there */
const OFF_TAB = ["/notifications"];

const TAB_ROOTS = ["/inbox", "/contacts", "/dashboard", "/dashboard/freelancer", "/more"];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function tabForPath(pathname: string): MobileTabId | null {
  if (OFF_TAB.some((p) => under(pathname, p))) return null;
  for (const [tab, prefixes] of TAB_PREFIXES) {
    if (prefixes.some((p) => under(pathname, p))) return tab;
  }
  return "more";
}

export function isTabRoot(pathname: string) {
  return TAB_ROOTS.includes(pathname);
}

/** Titles for routes that are not in the nav (detail pages, settings sub-pages) */
const EXTRA_TITLES: [RegExp, string][] = [
  [/^\/more$/, "More"],
  [/^\/notifications$/, "Notifications"],
  [/^\/dashboard\/freelancer$/, "Dashboard"],
  [/^\/search$/, "Search"],
  [/^\/contacts\/[^/]+$/, "Contact"],
  [/^\/campaigns\/[^/]+$/, "Campaign"],
  [/^\/automation\/[^/]+$/, "Automation"],
  [/^\/chatbot\/knowledge$/, "Bot knowledge"],
  [/^\/chatbot\/[^/]+$/, "Flow"],
  [/^\/proposals\/[^/]+$/, "Proposal"],
  [/^\/leads\/scraper\/[^/]+$/, "Scrape results"],
  [/^\/admin\/users\/[^/]+\/inbox$/, "Inbox"],
  [/^\/admin\/users\/[^/]+$/, "User"],
  [/^\/admin\/teams\/[^/]+$/, "Team"],
  [/^\/team\/members\/[^/]+\/inbox$/, "Inbox"],
  [/^\/team\/members\/[^/]+$/, "Member"],
  [/^\/team\/members$/, "Members"],
  [/^\/settings\/profile$/, "Profile"],
  [/^\/settings\/api-keys$/, "API Keys"],
  [/^\/settings\/shopify$/, "Shopify"],
  [/^\/settings\/sla$/, "SLA"],
  [/^\/settings\/custom-fields$/, "Custom Fields"],
  [/^\/settings\/channels$/, "Channels"],
  [/^\/sla\/policies$/, "SLA Policies"],
  [/^\/sla$/, "SLA"],
  [/^\/lead-ads$/, "Lead Ads"],
  [/^\/lead-scoring$/, "Lead Scoring"],
  [/^\/knowledge-base$/, "Knowledge Base"],
  [/^\/scheduler$/, "Scheduler"],
];

export function routeTitle(pathname: string): string {
  const nav = allNavItems.find((i) => i.href === pathname);
  if (nav) return nav.label;
  const extra = EXTRA_TITLES.find(([re]) => re.test(pathname));
  if (extra) return extra[1];
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return last.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Top-level list pages get the large title; detail screens get the compact bar. */
export function hasLargeTitle(pathname: string) {
  return isTabRoot(pathname) || allNavItems.some((i) => i.href === pathname);
}

/** Where "Back" goes when the page was opened directly (no in-app history). */
export function parentRoute(pathname: string): { href: string; label: string } {
  if (isTabRoot(pathname)) return { href: pathname, label: routeTitle(pathname) };
  // Opened from the bell in the top bar; Home is the natural way back
  if (pathname === "/notifications") return { href: "/dashboard", label: "Home" };
  // Pages listed on the More screen go back to it
  if (allNavItems.some((i) => i.href === pathname)) return { href: "/more", label: "More" };
  // Otherwise walk up to the nearest page we know
  const parts = pathname.split("/").filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    const href = "/" + parts.join("/");
    if (allNavItems.some((i) => i.href === href) || isTabRoot(href)) {
      return { href, label: routeTitle(href) };
    }
  }
  return { href: "/more", label: "More" };
}
