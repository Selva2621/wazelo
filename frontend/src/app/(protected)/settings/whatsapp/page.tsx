"use client";

import { MessageCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";

export default function WhatsAppSettingsPage() {
  usePageTitle("WhatsApp");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-[520px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div>
            <h2 className="text-title font-semibold text-on-surface">
              WhatsApp Connection
            </h2>
            <p className="text-body text-on-surface-variant">
              Link your WhatsApp account to send and receive messages
            </p>
          </div>
        </div>

        <WhatsAppConnectionPanel />
      </Card>
    </div>
  );
}
