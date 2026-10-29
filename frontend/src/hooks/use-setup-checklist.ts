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

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  /** Handled in place instead of navigating to href. */
  action?: "connect-whatsapp";
  done: boolean;
}

const DISMISSED_KEY = (orgId: string) => `setup_checklist_dismissed_${orgId}`;

export function useSetupChecklist() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId ?? "";
  const role = user?.role;
  const { data: orgSettings } = useOrgSettings();
  const isFreelancer = orgSettings?.orgType === "FREELANCER";

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
  const canTeachBot = role === "ADMIN" && aiEnabled;
  const { data: kbWebsites } = useKbWebsites({ enabled: canTeachBot });
  const { data: kbDocuments } = useKbDocuments(undefined, { enabled: canTeachBot });
  const { data: kbFaqs } = useKbFaqs({ enabled: canTeachBot });

  const items: ChecklistItem[] = useMemo(() => {
    const hasWhatsApp =
      !!whatsappSession && whatsappSession.status === "CONNECTED";

    const hasTemplate = Array.isArray(templates) && templates.length > 0;

    const contactCount =
      (contactsData as { total?: number } | undefined)?.total ?? 0;
    const hasContact = contactCount > 0;

    const hasProduct = Array.isArray(products) && products.length > 0;

    // Only knowledge the bot can use: read websites, processed files, published FAQs
    const hasKnowledge =
      (kbWebsites ?? []).some((s) => s.status === "READY" && s.pages > 0) ||
      (kbDocuments ?? []).some((d) => d.status === "READY") ||
      (kbFaqs ?? []).some((f) => f.isPublished);

    // Only show steps the user can act on: products are admin-only and not
    // part of the freelancer flow, templates need admin or manager
    const canManageProducts = role === "ADMIN" && !isFreelancer;
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
        label: "Add your products",
        description: "Define products or services to use in campaigns and contacts.",
        href: "/settings/products",
        done: hasProduct,
      },
      canManageTemplates && {
        id: "template",
        label: "Create a message template",
        description: "Save a reusable message for campaigns and outreach.",
        href: "/settings/templates",
        done: hasTemplate,
      },
      canTeachBot && {
        id: "knowledge",
        label: "Teach your bot",
        description: "Add your website, files or FAQs so the bot can answer questions.",
        href: "/chatbot/knowledge",
        done: hasKnowledge,
      },
      isFreelancer
        ? {
            id: "contacts",
            label: "Find your first leads",
            description: "Run the lead scraper or add a lead by hand.",
            href: "/leads/scraper",
            done: hasContact,
          }
        : {
            id: "contacts",
            label: "Import your contacts",
            description: "Add or import your customer list to start conversations.",
            href: "/contacts",
            done: hasContact,
          },
    ];
    return all.filter((i): i is ChecklistItem => Boolean(i));
  }, [whatsappSession, templates, contactsData, products, role, isFreelancer, canTeachBot, kbWebsites, kbDocuments, kbFaqs]);

  const allDone = items.every((i) => i.done);
  const doneCount = items.filter((i) => i.done).length;

  function dismiss() {
    if (!orgId) return;
    localStorage.setItem(DISMISSED_KEY(orgId), "true");
    setDismissed(true);
  }

  const visible = !dismissed && !allDone;

  return { items, doneCount, total: items.length, allDone, visible, dismissed, dismiss };
}
