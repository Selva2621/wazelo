"use client";

import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UsersRound,
  Megaphone,
  Zap,
  Settings,
  Wifi,
  Shield,
  FileText,
  ScrollText,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Star,
  Kanban,
  Briefcase,
  Bot,
  Workflow,
  Package,
  LifeBuoy,
  Globe,
  ScanSearch,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSubscription } from "@/hooks/use-billing";
import { useOrgSettings } from "@/hooks/use-settings";

/**
 * The app's navigation, shared by the desktop sidebar and the mobile "More" screen,
 * so both always show the same pages for the same role, plan and org type.
 */

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface NavItemDef {
  href: string;
  icon: ReactNode;
  label: string;
  countKey?: "inbox";
  /** Roles that can see this item. Undefined = all roles. */
  roles?: Role[];
  /** Plan feature flag required to see this item. */
  feature?: "campaigns" | "automation";
  /** If true, only FREELANCER orgs see this item. */
  freelancerOnly?: boolean;
}

interface NavGroup {
  label: string;
  /** If set, entire group is hidden unless user has one of these roles. */
  roles?: Role[];
  /** If true, group is hidden for FREELANCER org type. */
  hideForFreelancer?: boolean;
  items: NavItemDef[];
}

export interface NavSectionDef {
  label: string;
  items: Pick<NavItemDef, "href" | "icon" | "label">[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    ],
  },
  {
    label: "Messaging",
    items: [
      { href: "/inbox", icon: <MessageSquare className="h-5 w-5" />, label: "Inbox", countKey: "inbox" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/contacts", icon: <Users className="h-5 w-5" />, label: "Contacts" },
      { href: "/leads/scraper", icon: <ScanSearch className="h-5 w-5" />, label: "Lead Scraper" },
      { href: "/leads/pipeline", icon: <Kanban className="h-5 w-5" />, label: "Lead Pipeline" },
      { href: "/deals", icon: <Briefcase className="h-5 w-5" />, label: "Deals", freelancerOnly: true },
      { href: "/proposals", icon: <ScrollText className="h-5 w-5" />, label: "Proposals" },
      { href: "/settings/products", icon: <Package className="h-5 w-5" />, label: "Products", roles: ["ADMIN"] },
      // { href: "/deals", icon: <Kanban className="h-5 w-5" />, label: "Deals", roles: ["ADMIN", "MANAGER"] },
      // { href: "/lead-scoring", icon: <TrendingUp className="h-5 w-5" />, label: "Lead Scoring", roles: ["ADMIN", "MANAGER"] },
      // { href: "/lead-ads", icon: <Target className="h-5 w-5" />, label: "Lead Ads", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Marketing",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { href: "/campaigns", icon: <Megaphone className="h-5 w-5" />, label: "Campaigns", feature: "campaigns" },
      { href: "/sequences", icon: <Workflow className="h-5 w-5" />, label: "Sequences", feature: "campaigns" },
      // { href: "/scheduler", icon: <Clock className="h-5 w-5" />, label: "Scheduler" },
      { href: "/settings/templates", icon: <FileText className="h-5 w-5" />, label: "Templates", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Automation",
    roles: ["ADMIN", "MANAGER"],
    // Freelancers see it too — the pages open with recipes written for their work
    items: [
      { href: "/automation", icon: <Zap className="h-5 w-5" />, label: "Automation", feature: "automation" },
      { href: "/chatbot", icon: <Bot className="h-5 w-5" />, label: "Chatbot" },
      { href: "/settings/chat-widget", icon: <Globe className="h-5 w-5" />, label: "Chat Widget", roles: ["ADMIN"] },
    ],
  },
  {
    label: "Service",
    roles: ["ADMIN", "MANAGER"],
    hideForFreelancer: true,
    items: [
      { href: "/csat", icon: <Star className="h-5 w-5" />, label: "CSAT" },
      // { href: "/sla", icon: <ShieldCheck className="h-5 w-5" />, label: "SLA Tracking" },
      // { href: "/knowledge-base", icon: <BookOpen className="h-5 w-5" />, label: "Knowledge Base" },
    ],
  },
  {
    label: "Settings",
    items: [
      // Everyone needs their own number connected before anything can be sent
      { href: "/settings/whatsapp", icon: <Wifi className="h-5 w-5" />, label: "WhatsApp" },
      { href: "/settings", icon: <Settings className="h-5 w-5" />, label: "Settings", roles: ["ADMIN"] },
      // { href: "/settings/channels", icon: <Radio className="h-5 w-5" />, label: "Channels", roles: ["ADMIN", "MANAGER"] },
      { href: "/settings/billing", icon: <CreditCard className="h-5 w-5" />, label: "Billing", roles: ["ADMIN"] },
      { href: "/settings/ai-credits", icon: <Sparkles className="h-5 w-5" />, label: "AI Credits", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/support", icon: <LifeBuoy className="h-5 w-5" />, label: "Support" },
    ],
  },
];

const adminNavItems = [
  { href: "/admin/users", icon: <Users className="h-5 w-5" />, label: "Users" },
  { href: "/admin/teams", icon: <UsersRound className="h-5 w-5" />, label: "Teams" },
  { href: "/admin/whatsapp-sessions", icon: <Wifi className="h-5 w-5" />, label: "WhatsApp Sessions" },
  { href: "/admin/roles-permissions", icon: <Shield className="h-5 w-5" />, label: "Permissions" },
  { href: "/admin/audit-logs", icon: <FileText className="h-5 w-5" />, label: "Audit Logs" },
  { href: "/admin/gdpr", icon: <ShieldCheck className="h-5 w-5" />, label: "GDPR" },
];

const managerNavItems = [
  { href: "/team", icon: <UsersRound className="h-5 w-5" />, label: "My Team" },
];

/** Every nav item regardless of access, for route titles and back labels. */
export const allNavItems: Pick<NavItemDef, "href" | "label">[] = [
  ...navGroups.flatMap((g) => g.items),
  ...adminNavItems,
  ...managerNavItems,
];

/** The nav sections this user can see, in sidebar order. */
export function useNavSections(): { sections: NavSectionDef[]; isFreelancer: boolean } {
  const user = useAuthStore((s) => s.user);
  const { data: subData } = useSubscription();
  const { data: orgSettings } = useOrgSettings();
  const plan = subData?.subscription?.plan;
  const isFreelancer = orgSettings?.orgType === "FREELANCER";
  const role = user?.role as Role;

  function isFeatureAllowed(feature?: "campaigns" | "automation"): boolean {
    if (!feature) return true;
    if (!plan) return true; // don't hide while loading
    if (feature === "campaigns") return plan.campaignsEnabled ?? false;
    if (feature === "automation") return plan.automationEnabled ?? false;
    return true;
  }

  const sections: NavSectionDef[] = [];
  for (const group of navGroups) {
    if (isFreelancer && group.hideForFreelancer) continue;
    if (group.roles && !group.roles.includes(role)) continue;

    // Freelancers get their own dashboard view
    const items = group.items
      .map((item) =>
        isFreelancer && item.href === "/dashboard" ? { ...item, href: "/dashboard/freelancer" } : item,
      )
      .filter((item) => !item.freelancerOnly || isFreelancer)
      .filter((item) => !item.roles || item.roles.includes(role))
      .filter((item) => isFeatureAllowed(item.feature));

    if (items.length > 0) sections.push({ label: group.label, items });
  }

  if (user?.role === "MANAGER") sections.push({ label: "Team", items: managerNavItems });
  if (user?.role === "ADMIN" && !isFreelancer) sections.push({ label: "Admin", items: adminNavItems });

  return { sections, isFreelancer };
}
