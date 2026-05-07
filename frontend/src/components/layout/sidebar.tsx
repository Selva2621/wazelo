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
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Flame,
  Wifi,
  Shield,
  FileText,
  CreditCard,
  Activity,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./nav-item";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-billing";

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
      { href: "/deals", icon: <Kanban className="h-5 w-5" />, label: "Deals", roles: ["ADMIN", "MANAGER"] },
      { href: "/lead-scoring", icon: <TrendingUp className="h-5 w-5" />, label: "Lead Scoring", roles: ["ADMIN", "MANAGER"] },
      { href: "/lead-ads", icon: <Target className="h-5 w-5" />, label: "Lead Ads", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Marketing",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { href: "/campaigns", icon: <Megaphone className="h-5 w-5" />, label: "Campaigns", feature: "campaigns" },
      { href: "/sequences", icon: <Workflow className="h-5 w-5" />, label: "Sequences", feature: "campaigns" },
      { href: "/scheduler", icon: <Clock className="h-5 w-5" />, label: "Scheduler" },
      { href: "/settings/templates", icon: <FileText className="h-5 w-5" />, label: "Templates", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Automation",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { href: "/automation", icon: <Zap className="h-5 w-5" />, label: "Automation", feature: "automation" },
      { href: "/chatbot", icon: <Bot className="h-5 w-5" />, label: "Chatbot" },
    ],
  },
  {
    label: "Service",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { href: "/csat", icon: <Star className="h-5 w-5" />, label: "CSAT" },
      { href: "/sla", icon: <ShieldCheck className="h-5 w-5" />, label: "SLA Tracking" },
      { href: "/knowledge-base", icon: <BookOpen className="h-5 w-5" />, label: "Knowledge Base" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", icon: <Settings className="h-5 w-5" />, label: "Settings", roles: ["ADMIN"] },
      { href: "/settings/channels", icon: <Radio className="h-5 w-5" />, label: "Channels", roles: ["ADMIN", "MANAGER"] },
      { href: "/settings/products", icon: <Package className="h-5 w-5" />, label: "Products", roles: ["ADMIN"] },
      { href: "/settings/billing", icon: <CreditCard className="h-5 w-5" />, label: "Billing", roles: ["ADMIN"] },
      { href: "/settings/whatsapp", icon: <Wifi className="h-5 w-5" />, label: "WhatsApp", roles: ["EMPLOYEE", "MANAGER"] },
      { href: "/settings/chat-widget", icon: <Globe className="h-5 w-5" />, label: "Chat Widget", roles: ["ADMIN"] },
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
  { href: "/admin/observability", icon: <Activity className="h-5 w-5" />, label: "Observability" },
];

const managerNavItems = [
  { href: "/team", icon: <UsersRound className="h-5 w-5" />, label: "My Team" },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: subData } = useSubscription();
  const plan = subData?.subscription?.plan;

  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "User";

  function isFeatureAllowed(feature?: "campaigns" | "automation"): boolean {
    if (!feature) return true;
    if (!plan) return true; // don't hide while loading
    if (feature === "campaigns") return plan.campaignsEnabled ?? false;
    if (feature === "automation") return plan.automationEnabled ?? false;
    return true;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col bg-surface-container-lowest transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center h-[var(--header-height)] shrink-0 px-4",
          collapsed ? "justify-center px-0" : "gap-2",
        )}
      >
        <Flame className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="text-[16px] font-bold text-on-surface tracking-tight">
            Waze<span className="text-primary">lo</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group) => {
          // Hide group if user doesn't have required role
          if (group.roles && !group.roles.includes(user?.role as Role)) return null;

          // Filter items by role and feature
          const visibleItems = group.items
            .filter((item) => !item.roles || item.roles.includes(user?.role as Role))
            .filter((item) => isFeatureAllowed(item.feature));

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-1">
              {/* Group header */}
              {!collapsed ? (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 px-2 pt-3 pb-1 block">
                  {group.label}
                </span>
              ) : (
                <div className="my-2 mx-1 border-t border-outline-variant/15" />
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    count={undefined}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Manager section */}
        {user?.role === "MANAGER" && (
          <div className="mb-1">
            {!collapsed ? (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 px-2 pt-3 pb-1 block">
                Team
              </span>
            ) : (
              <div className="my-2 mx-1 border-t border-outline-variant/15" />
            )}
            <div className="space-y-1">
              {managerNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        )}

        {/* Admin section */}
        {user?.role === "ADMIN" && (
          <div className="mb-1">
            {!collapsed ? (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 px-2 pt-3 pb-1 block">
                Admin
              </span>
            ) : (
              <div className="my-2 mx-1 border-t border-outline-variant/15" />
            )}
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div
        className={cn(
          "shrink-0 border-t border-outline-variant/15 px-3 py-3 space-y-2",
          collapsed && "px-1",
        )}
      >
        {/* User info — click to open profile */}
        <a
          href="/settings/profile"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-container transition-colors cursor-pointer",
            collapsed && "justify-center px-0",
          )}
          title="Edit profile"
        >
          <Avatar name={userName} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {userName}
              </p>
              <Badge variant="primary" className="mt-0.5">
                {user?.role ?? "User"}
              </Badge>
            </div>
          )}
        </a>

        {/* Actions */}
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed ? "flex-col" : "justify-between px-2",
          )}
        >
          <button
            onClick={() => logout.mutate()}
            className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSidebar}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
