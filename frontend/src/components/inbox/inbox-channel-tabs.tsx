"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Globe, MessageCircle } from "lucide-react";
import { listWebsiteChats } from "@/lib/api/widget";
import { cn } from "@/lib/utils";

/**
 * Inbox: WhatsApp chats | Website chats (from the website chat widget).
 * The Website count is how many visitors are waiting for a reply.
 */
export function InboxChannelTabs({ active, className }: { active: "whatsapp" | "website"; className?: string }) {
  const { data } = useQuery({
    queryKey: ["website-chats", "open"],
    queryFn: () => listWebsiteChats("open"),
    refetchInterval: 15_000,
  });
  const waiting = data?.data.filter((c) => c.waiting).length ?? 0;

  const tab = (key: "whatsapp" | "website", href: string, label: string, Icon: typeof Globe, count?: number) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-label font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-focus",
        active === key
          ? "border-transparent bg-on-surface text-surface"
          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      {!!count && (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full px-1.5 text-caption font-semibold tabular-nums",
            active === key ? "bg-surface/20" : "bg-primary text-on-primary",
          )}
          aria-label={`${count} waiting`}
        >
          {count}
        </span>
      )}
    </Link>
  );

  return (
    <nav aria-label="Inbox channel" className={cn("flex items-center gap-1.5", className)}>
      {tab("whatsapp", "/inbox", "WhatsApp", MessageCircle)}
      {tab("website", "/inbox?channel=website", "Website", Globe, waiting)}
    </nav>
  );
}
