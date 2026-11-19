"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

import { useWhatsAppSession } from "@/hooks/use-whatsapp";

import { useTemplates } from "@/hooks/use-templates";
import { useContacts } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useOrgSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-billing";
import { useKbDocuments, useKbFaqs, useKbWebsites } from "@/hooks/use-knowledge-base";
import { useWidgetConfig } from "@/hooks/use-widget";
import { useEmailAccount } from "@/hooks/use-email";
import { useUsers } from "@/hooks/use-users";
import { useBotBehavior } from "@/hooks/use-chatbot";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  /** Handled in place instead of navigating to href. */
  action?: "connect-whatsapp";
  /** Button text; falls back to the per-step default in the checklist */
  actionLabel?: string;
  done: boolean;
  /** Nice to have: listed last, marked "Optional", never holds back "You're all set". */
  optional?: boolean;
}

const DISMISSED_KEY = (orgId: string) => `setup_checklist_dismissed_${orgId}`;

export function useSetupChecklist() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId ?? "";
  const role = user?.role;
  const { data: orgSettings } = useOrgSettings();
  const isFreelancer = orgSettings?.orgType === "FREELANCER";
  const isAdmin = role === "ADMIN";

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setDismissed(localStorage.getItem(DISMISSED_KEY(orgId)) === "true");
  }, [orgId]);

  const { data: whatsappSession } = useWhatsAppSession();
  const { data: templates } = useTemplates();
  const { data: contactsData } = useContacts();
  const { data: products } = useProducts();

  // Bot knowledge: admins only (editing needs settings rights) and only on plans with AI
  const { data: sub } = useSubscription();
  const aiEnabled = sub?.subscription?.plan?.aiEnabled ?? true;
  const canTeachBot = isAdmin && aiEnabled;
  const { data: kbWebsites } = useKbWebsites({ enabled: canTeachBot });
  const { data: kbDocuments } = useKbDocuments(undefined, { enabled: canTeachBot });
  const { data: kbFaqs } = useKbFaqs({ enabled: canTeachBot });

  // Website chat, business email, team and working hours: settings only admins change
  const { data: widget } = useWidgetConfig({ enabled: isAdmin });
  const { data: emailAccount } = useEmailAccount({ enabled: isAdmin });
  const { data: usersData } = useUsers(undefined, { enabled: isAdmin && !isFreelancer });
  const { data: behavior } = useBotBehavior({ enabled: isAdmin && !isFreelancer });

  const items: ChecklistItem[] = useMemo(() => {
    const hasWhatsApp =
      !!whatsappSession && whatsappSession.status === "CONNECTED";

    // Starter templates come with every workspace: only ones the member made count
    const hasTemplate =
      Array.isArray(templates) &&
      templates.some((t) => (t.exampleValues as Record<string, unknown> | null)?.isSystemTemplate !== true);

    const contactCount =
      (contactsData as { total?: number } | undefined)?.total ?? 0;
    const hasContact = contactCount > 0;

    const hasProduct = Array.isArray(products) && products.length > 0;

    // Only knowledge the bot can use: read websites, processed files, published FAQs
    const hasKnowledge =
      (kbWebsites ?? []).some((s) => s.status === "READY" && s.pages > 0) ||
      (kbDocuments ?? []).some((d) => d.status === "READY") ||
      (kbFaqs ?? []).some((f) => f.isPublished);

    const hasWidget = !!widget?.enabled;
    const hasEmail = emailAccount?.status === "ACTIVE";
    const hasTeammate = (usersData?.total ?? usersData?.users?.length ?? 0) > 1;
    const hasHours = !!behavior?.hoursEnabled;

    // Only show steps the user can act on: products (services, for freelancers) are
    // admin-only, templates need admin or manager
    const canManageProducts = isAdmin;
    const canManageTemplates = role === "ADMIN" || role === "MANAGER";

    const all: (ChecklistItem | false)[] = [
      {
        id: "whatsapp",
        label: "Connect WhatsApp",
        description: "Link your WhatsApp number to start messaging.",
        href: "/settings/whatsapp",
        action: "connect-whatsapp",
        done: hasWhatsApp,
      },
      canManageProducts && {
        id: "products",
        label: isFreelancer ? "Add your services" : "Add your products",
        description: isFreelancer
          ? "Define the services you offer to use in campaigns and contacts."
          : "Define products or services to use in campaigns and contacts.",
        href: "/settings/products",
        done: hasProduct,
        optional: true,
      },
      canManageTemplates && {
        id: "template",
        label: "Create a message template",
        description: "Edit a starter template or write your own for campaigns and outreach.",
        href: "/settings/templates",
        done: hasTemplate,
      },
      canTeachBot && {
        id: "knowledge",
        label: "Teach your AI assistant",
        description: "Add your website, files or FAQs so it can answer customers on WhatsApp and your website.",
        href: "/ai-assistant",
        done: hasKnowledge,
      },
      isFreelancer
        ? {
            id: "contacts",
            label: "Find your first leads",
            description: "Run the lead scraper or add a lead by hand.",
            href: "/leads/scraper",
            actionLabel: "Find leads",
            done: hasContact,
          }
        : {
            id: "contacts",
            label: "Import your contacts",
            description: "Add or import your customer list to start conversations.",
            href: "/contacts",
            actionLabel: "Import",
            done: hasContact,
          },
      // Team workspaces: chats are shared and handed over between members
      isAdmin && !isFreelancer && {
        id: "team",
        label: "Invite your team",
        description: "Add teammates so chats can be shared and handed over.",
        href: "/admin/users",
        actionLabel: "Invite",
        done: hasTeammate,
      },
      isAdmin && {
        id: "widget",
        label: "Add chat to your website",
        description: isFreelancer
          ? "Visitors chat with your AI assistant and can ask for you."
          : "Visitors chat with your AI assistant and can ask for a person.",
        href: "/settings/chat-widget",
        actionLabel: "Set up",
        done: hasWidget,
        optional: true,
      },
      isAdmin && {
        id: "email",
        label: "Connect your email",
        description: "Send email campaigns and follow-ups from your own address.",
        href: "/settings/email",
        actionLabel: "Connect",
        done: hasEmail,
        optional: true,
      },
      isAdmin && !isFreelancer && {
        id: "hours",
        label: "Set working hours",
        description: "After hours, customers are told when you'll reply.",
        href: "/ai-assistant#handover",
        actionLabel: "Set",
        done: hasHours,
        optional: true,
      },
    ];
    return all.filter((i): i is ChecklistItem => Boolean(i));
  }, [whatsappSession, templates, contactsData, products, role, isAdmin, isFreelancer, canTeachBot, kbWebsites, kbDocuments, kbFaqs, widget, emailAccount, usersData, behavior]);

  // Progress counts the required steps only
  const required = items.filter((i) => !i.optional);
  const allDone = required.every((i) => i.done);
  const doneCount = required.filter((i) => i.done).length;

  function dismiss() {
    if (!orgId) return;
    localStorage.setItem(DISMISSED_KEY(orgId), "true");
    setDismissed(true);
  }

  const visible = !dismissed && !allDone;

  return { items, doneCount, total: required.length, allDone, visible, dismissed, dismiss };
}
