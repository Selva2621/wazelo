"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";

/**
 * Warns that sending needs a connected WhatsApp number. Renders nothing while
 * loading or when the user's own session is connected.
 */
export function WhatsAppRequiredBanner({ action, className }: { action: string; className?: string }) {
  const { data: session, isLoading } = useWhatsAppSession();
  if (isLoading || session?.status === "CONNECTED") return null;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-body text-warning", className)}>
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">Connect your WhatsApp number to {action}.</span>
      <Link href="/settings/whatsapp" className="font-medium underline hover:text-on-surface shrink-0">
        Connect WhatsApp
      </Link>
    </div>
  );
}
