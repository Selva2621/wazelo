"use client";

import { PageHeader } from "@/components/layout/page-header";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";

export default function WhatsAppSettingsPage() {
  usePageTitle("WhatsApp");

  return (
    <div className="flex-1 space-y-5 p-6">
      <PageHeader title="WhatsApp connection" className="max-lg:hidden" />
      <Card className="w-full max-w-2xl">
        <WhatsAppConnectionPanel />
      </Card>
    </div>
  );
}
