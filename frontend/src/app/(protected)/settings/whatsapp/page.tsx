"use client";

import { PageHeader } from "@/components/layout/page-header";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";
import { OfficialNumberCard } from "@/components/whatsapp/official-number-card";

export default function WhatsAppSettingsPage() {
  usePageTitle("WhatsApp");
  // Connected: one wide card with its own sections. Linking / disconnected: a narrow centred card.
  const connected = useWhatsAppStore((s) => s.status === "connected");

  return (
    <div className="flex-1 space-y-5 p-6">
      <PageHeader title="WhatsApp connection" className="max-lg:hidden" />
      {/* Official number (org-wide) first, then the person's own QR-linked number */}
      <OfficialNumberCard />
      <Card className={cn("w-full", connected ? "max-w-5xl p-0" : "max-w-2xl")}>
        <WhatsAppConnectionPanel />
      </Card>
    </div>
  );
}
