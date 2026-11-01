"use client";

import Link from "next/link";
import { Globe, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useChatbotFlows } from "@/hooks/use-chatbot";
import { useUpdateWidgetConfig, useWidgetConfig } from "@/hooks/use-widget";
import { useAuthStore } from "@/stores/auth-store";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { errorMessage, knowledgeCard } from "./knowledge-cards";

const rowCls = "flex items-center gap-3 py-3 first:pt-0 last:pb-0";
const linkCls = "text-label font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus rounded";

/**
 * Where the AI assistant answers customers. Both channels use the knowledge and
 * instructions on the AI assistant page, so they give the same answers.
 */
export function RepliesOnCard({ className }: { className?: string }) {
  const isAdmin = useAuthStore((s) => s.user?.role) === "ADMIN";
  const { data: flows } = useChatbotFlows();
  const { data: widget } = useWidgetConfig();
  const updateWidget = useUpdateWidgetConfig();

  const aiFlows = (flows ?? []).filter((f) => f.isActive && f.aiEnabled).length;
  const whatsappText = aiFlows > 0 ? `On in ${aiFlows} active chatbot${aiFlows === 1 ? "" : "s"}` : "Off: no active AI chatbot";

  const widgetLive = !!widget?.enabled;
  const websiteAi = !!widget?.aiAssistantEnabled;
  const websiteText = !widgetLive ? "Chat widget is off" : websiteAi ? "On" : "Off: your team replies";

  const toggleWebsite = (on: boolean) =>
    updateWidget.mutate(
      { aiAssistantEnabled: on },
      { onError: (err) => toast.error(errorMessage(err, "Couldn't save")) },
    );

  return (
    <section aria-labelledby="replies-on-heading" className={cn(knowledgeCard, "p-5", className)}>
      <h2 id="replies-on-heading" className="text-body-lg font-medium text-on-surface">Answers on</h2>
      <p className="text-label text-on-surface-variant">Both use the knowledge and instructions below.</p>

      <ul className="mt-3 divide-y divide-outline-variant/60">
        <li className={rowCls}>
          <MessageCircle className="h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-body text-on-surface">WhatsApp</p>
            <p className="text-label text-on-surface-variant">{whatsappText}</p>
          </div>
          <Link href="/chatbot" className={linkCls}>
            {aiFlows > 0 ? "Manage" : "Set up"}
          </Link>
        </li>
        <li className={rowCls}>
          <Globe className="h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden />
          <div className="min-w-0 flex-1">
            <p id="website-ai-label" className="text-body text-on-surface">Website chat</p>
            <p className="text-label text-on-surface-variant">{websiteText}</p>
          </div>
          {widgetLive ? (
            <Switch
              aria-labelledby="website-ai-label"
              checked={websiteAi}
              disabled={!isAdmin || !widget || updateWidget.isPending}
              onChange={toggleWebsite}
            />
          ) : (
            <Link href="/settings/chat-widget" className={linkCls}>
              Set up
            </Link>
          )}
        </li>
      </ul>
    </section>
  );
}
