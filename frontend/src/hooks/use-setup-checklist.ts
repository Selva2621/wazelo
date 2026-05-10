"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

import { useWhatsAppSession } from "@/hooks/use-whatsapp";

import { useTemplates } from "@/hooks/use-templates";
import { useContacts } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

const DISMISSED_KEY = (orgId: string) => `setup_checklist_dismissed_${orgId}`;

export function useSetupChecklist() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId ?? "";

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setDismissed(localStorage.getItem(DISMISSED_KEY(orgId)) === "true");
  }, [orgId]);

  const { data: whatsappSession } = useWhatsAppSession();
  const { data: templates } = useTemplates();
  const { data: contactsData } = useContacts();
  const { data: products } = useProducts();

  const items: ChecklistItem[] = useMemo(() => {
    const hasWhatsApp =
      !!whatsappSession && whatsappSession.status === "CONNECTED";

    const hasTemplate = Array.isArray(templates) && templates.length > 0;

    const contactCount =
      (contactsData as { total?: number } | undefined)?.total ?? 0;
    const hasContact = contactCount > 0;

    const hasProduct = Array.isArray(products) && products.length > 0;

    return [
      {
        id: "whatsapp",
        label: "Connect WhatsApp",
        description: "Link your WhatsApp Business number to start messaging.",
        href: "/settings/whatsapp",
        done: hasWhatsApp,
      },


      {
        id: "products",
        label: "Add your products",
        description: "Define products or services to use in campaigns and contacts.",
        href: "/settings/products",
        done: hasProduct,
      },
      {
        id: "template",
        label: "Create a message template",
        description: "Set up WhatsApp templates to run broadcast campaigns.",
        href: "/settings/templates",
        done: hasTemplate,
      },
      {
        id: "contacts",
        label: "Import your contacts",
        description: "Add or import your customer list to start conversations.",
        href: "/contacts",
        done: hasContact,
      },
    ];
  }, [whatsappSession, templates, contactsData, products]);

  const allDone = items.every((i) => i.done);
  const doneCount = items.filter((i) => i.done).length;

  function dismiss() {
    if (!orgId) return;
    localStorage.setItem(DISMISSED_KEY(orgId), "true");
    setDismissed(true);
  }

  const visible = !dismissed && !allDone;

  return { items, doneCount, total: items.length, allDone, visible, dismiss };
}
