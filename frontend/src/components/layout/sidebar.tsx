"use client";

import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UsersRound,
  Megaphone,
  Clock,
  Zap,
  Settings,
  LogOut,
  Wifi,
  Shield,
  FileText,
  CreditCard,
  ShieldCheck,
  Radio,
  Target,
  Star,
  Kanban,
  TrendingUp,
  Bot,
  Workflow,
  BookOpen,
  Package,
  LifeBuoy,
  Globe,
  ScanSearch,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavItem } from "./nav-item";
import { Avatar } from "@/components/ui/avatar";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-billing";
import { useOrgSettings } from "@/hooks/use-settings";
import { IconButton } from "@/components/ui/icon-button";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface NavItemDef {
  href: string;
  icon: React.ReactNode;
  label: string;
  countKey?: "inbox";
  /** Roles that can see this item. Undefined = all roles. */
  roles?: Role[];
  /** Plan feature flag required to see this item. */
  feature?: "campaigns" | "automation";
}

interface NavGroup {
  label: string;
  /** If set, entire group is hidden unless user has one of these roles. */
  roles?: Role[];
  /** If true, group is hidden for FREELANCER org type. */
  hideForFreelancer?: boolean;
  items: NavItemDef[];
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
    hideForFreelancer: true,
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
      { href: "/settings", icon: <Settings className="h-5 w-5" />, label: "Settings", roles: ["ADMIN"] },
      // { href: "/settings/channels", icon: <Radio className="h-5 w-5" />, label: "Channels", roles: ["ADMIN", "MANAGER"] },
      { href: "/settings/billing", icon: <CreditCard className="h-5 w-5" />, label: "Billing", roles: ["ADMIN"] },
      { href: "/settings/whatsapp", icon: <Wifi className="h-5 w-5" />, label: "WhatsApp", roles: ["EMPLOYEE", "MANAGER"] },
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
  { href: "/admin/whatsapp-sessions", icon: <Wifi className="h-5 w-5" />, label: "WA Sessions" },
  { href: "/admin/roles-permissions", icon: <Shield className="h-5 w-5" />, label: "Permissions" },
  { href: "/admin/audit-logs", icon: <FileText className="h-5 w-5" />, label: "Audit Logs" },
  { href: "/admin/gdpr", icon: <ShieldCheck className="h-5 w-5" />, label: "GDPR" },
];

const managerNavItems = [
  { href: "/team", icon: <UsersRound className="h-5 w-5" />, label: "My Team" },
];

function NavSection({ label, items }: { label: string; items: Pick<NavItemDef, "href" | "icon" | "label">[] }) {
  return (
    <div className="pt-3">
      <p className="side-label truncate px-4 pb-1 text-label text-on-surface-variant">{label}</p>
      <ul className="pl-2.5">
        {items.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: subData } = useSubscription();
  const { data: orgSettings } = useOrgSettings();
  const plan = subData?.subscription?.plan;
  const isFreelancer = orgSettings?.orgType === "FREELANCER";

  const userName = user ? `${user.firstName} ${user.lastName}` : "User";

  // Close the off-canvas drawer on navigation and on Escape.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  function isFeatureAllowed(feature?: "campaigns" | "automation"): boolean {
    if (!feature) return true;
    if (!plan) return true; // don't hide while loading
    if (feature === "campaigns") return plan.campaignsEnabled ?? false;
    if (feature === "automation") return plan.automationEnabled ?? false;
    return true;
  }

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      data-collapsed={collapsed}
      data-open={mobileOpen}
      className={cn(
        "app-sidebar fixed left-0 top-0 z-40 flex h-dvh w-[var(--sidebar-width)] flex-col overflow-hidden bg-sidebar",
        "transition-[width,translate,box-shadow] duration-200 ease-standard",
        "max-lg:-translate-x-full max-lg:data-[open=true]:translate-x-0 max-lg:data-[open=true]:shadow-modal",
      )}
    >
      {/* Brand */}
      <Link
        href={isFreelancer ? "/dashboard/freelancer" : "/dashboard"}
        className="flex h-[var(--header-height)] shrink-0 items-center gap-2.5 px-[22px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <img src="/logo/logo.png" alt="" className="size-7 shrink-0 object-contain" />
        <span className="side-label text-title-sm font-semibold tracking-tight text-on-surface">
          Waze<span className="text-primary-container">lo</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="side-scroll flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {navGroups.map((group) => {
          if (isFreelancer && group.hideForFreelancer) return null;
          if (group.roles && !group.roles.includes(user?.role as Role)) return null;

          // Freelancers get their own dashboard view
          const items = group.items
            .map((item) =>
              isFreelancer && item.href === "/dashboard" ? { ...item, href: "/dashboard/freelancer" } : item,
            )
            .filter((item) => !item.roles || item.roles.includes(user?.role as Role))
            .filter((item) => isFeatureAllowed(item.feature));

          if (items.length === 0) return null;
          return <NavSection key={group.label} label={group.label} items={items} />;
        })}

        {user?.role === "MANAGER" && <NavSection label="Team" items={managerNavItems} />}
        {user?.role === "ADMIN" && !isFreelancer && <NavSection label="Admin" items={adminNavItems} />}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-outline-variant p-3">
        <div className="flex items-center gap-1">
          <Link
            href="/settings/profile"
            title="Edit profile"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors duration-120 ease-standard hover:bg-surface-container-low outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Avatar name={userName} size="sm" className="ml-0.5" />
            <span className="side-label min-w-0 flex-1">
              <span className="block truncate text-body font-medium text-on-surface">{userName}</span>
              <span className="block truncate text-caption font-normal text-on-surface-variant">
                {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "User"}
              </span>
            </span>
          </Link>
          <IconButton
            size="sm"
            variant="danger"
            className="side-label"
            onClick={() => logout.mutate()}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}

