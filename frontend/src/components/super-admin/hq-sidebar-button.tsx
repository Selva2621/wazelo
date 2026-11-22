"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight, BookOpen, Bot, Briefcase, Building, FileText, Globe, Loader2, Megaphone,
  MessageSquare, Plus, Sparkles, TriangleAlert, Users, Wifi, Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { superAdminApi } from "@/lib/api/super-admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const HQ_KEY = ["sa", "hq"] as const;

/** HQ screens one click away; each opens in a new tab, signed in to HQ */
const HQ_LINKS = [
  { path: "/inbox", label: "Inbox", icon: MessageSquare },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/deals", label: "Deals", icon: Briefcase },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/sequences", label: "Sequences", icon: Workflow },
  { path: "/chatbot", label: "Chatbot", icon: Bot },
  { path: "/ai-assistant", label: "AI assistant", icon: Sparkles },
  { path: "/knowledge-base", label: "Knowledge base", icon: BookOpen },
  { path: "/settings/chat-widget", label: "Chat widget", icon: Globe },
  { path: "/settings/templates", label: "Templates", icon: FileText },
  { path: "/settings/whatsapp", label: "WhatsApp", icon: Wifi },
] as const;

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

/**
 * Top of the super admin sidebar: Wazelo HQ (the platform's own workspace) and its
 * main screens, each opening in a new tab signed in as you, plus what HQ still needs
 * before it can WhatsApp customers. Before HQ exists it offers to set it up.
 */
export function HqSidebarButton({ focusRing }: { focusRing: string }) {
  const queryClient = useQueryClient();
  const hq = useQuery({ queryKey: HQ_KEY, queryFn: superAdminApi.getHq });
  const [confirmCreate, setConfirmCreate] = useState(false);

  const open = useMutation({
    // The tab is opened synchronously on click (async window.open is popup-blocked),
    // then pointed at the one-time link once it arrives.
    mutationFn: async ({ tab, next }: { tab: Window | null; next?: string }) => ({
      tab,
      link: await superAdminApi.openHq(next),
    }),
    onSuccess: ({ tab, link }) => {
      if (tab && !tab.closed) tab.location.href = link.url;
      else window.location.assign(link.url);
    },
    onError: (err, { tab }) => {
      tab?.close();
      toast.error(errorMessage(err, "Couldn't open Wazelo HQ"));
    },
  });

  const create = useMutation({
    mutationFn: superAdminApi.createHq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HQ_KEY });
      setConfirmCreate(false);
      toast.success("Wazelo HQ is ready. Setting up its pipeline and templates takes a minute.");
    },
    onError: (err) => toast.error(errorMessage(err, "Couldn't create Wazelo HQ")),
  });

  const openInNewTab = (next?: string) => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    open.mutate({ tab, next });
  };

  if (hq.isLoading || hq.isError) return null;

  if (!hq.data?.exists) {
    return (
      <div className="px-2 pt-3">
        <button
          type="button"
          onClick={() => setConfirmCreate(true)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-dashed border-outline-variant px-3 py-2 text-body-lg font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface",
            focusRing,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="flex-1 text-left">Set up Wazelo HQ</span>
        </button>
        <ConfirmDialog
          open={confirmCreate}
          title="Set up Wazelo HQ?"
          message="A workspace for Wazelo's own leads, website chats and customer messages: every feature on, no billing. You get an admin login there."
          confirmLabel="Set up HQ"
          loading={create.isPending}
          onConfirm={() => create.mutate()}
          onCancel={() => setConfirmCreate(false)}
        />
      </div>
    );
  }

  const setup = hq.data.setup;
  const readyAlerts = setup?.alerts.filter((a) => a.ready).length ?? 0;
  const totalAlerts = setup?.alerts.length ?? 0;
  const pendingNext = open.isPending ? open.variables?.next : undefined;

  return (
    <section aria-labelledby="hq-nav-heading" className="border-b border-outline-variant px-2 py-3">
      <button
        type="button"
        onClick={() => openInNewTab()}
        disabled={open.isPending}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-lg font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60",
          focusRing,
        )}
      >
        {open.isPending && !pendingNext ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Building className="h-4 w-4" aria-hidden />}
        <span id="hq-nav-heading" className="flex-1 text-left">Wazelo HQ</span>
        <ArrowUpRight className="h-4 w-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </button>

      <ul className="mt-1 space-y-0.5">
        {HQ_LINKS.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => openInNewTab(path)}
              disabled={open.isPending}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-body text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60",
                focusRing,
              )}
            >
              {pendingNext === path ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
              <span className="flex-1 text-left">{label}</span>
              <span className="sr-only">(opens Wazelo HQ in a new tab)</span>
            </button>
          </li>
        ))}
      </ul>

      {/* What HQ still needs before it can WhatsApp customers */}
      {setup && (!setup.whatsappConnected || readyAlerts < totalAlerts) && (
        <button
          type="button"
          onClick={() => openInNewTab(setup.whatsappConnected ? "/settings/templates" : "/settings/whatsapp")}
          disabled={open.isPending}
          title={setup.alerts.filter((a) => !a.ready).map((a) => `${a.template} — ${a.label}`).join("\n")}
          className={cn(
            "mt-2 flex w-full items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-left text-label text-on-surface-variant transition-colors hover:bg-warning/15 disabled:opacity-60",
            focusRing,
          )}
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            {setup.whatsappConnected
              ? `Customer WhatsApp alerts: ${readyAlerts}/${totalAlerts} templates ready`
              : "Connect HQ's WhatsApp number to message customers"}
          </span>
        </button>
      )}
    </section>
  );
}
