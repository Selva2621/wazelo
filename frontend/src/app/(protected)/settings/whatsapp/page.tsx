"use client";

import { PageHeader } from "@/components/layout/page-header";
import { FormWithRail, RailCard, RailRow } from "@/components/layout/form-with-rail";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";
import { OfficialNumberCard } from "@/components/whatsapp/official-number-card";

const STATUS_LABEL: Record<string, { label: string; dot: string }> = {
  loading: { label: "Checking…", dot: "bg-on-surface-variant" },
  no_session: { label: "Not linked", dot: "bg-on-surface-variant" },
  connecting: { label: "Linking", dot: "bg-warning" },
  reconnecting: { label: "Reconnecting", dot: "bg-warning" },
  disconnected: { label: "Disconnected", dot: "bg-error" },
  connected: { label: "Connected", dot: "bg-success" },
};

const LINK_STEPS = [
  "Open WhatsApp on your phone",
  "Settings → Linked devices → Link a device",
  "Scan the QR code here",
];

function LinkRail() {
  const status = useWhatsAppStore((s) => s.status);
  const phone = useWhatsAppStore((s) => s.session?.phoneNumber);
  const role = useAuthStore((s) => s.user?.role);
  // The official number card only shows for admins and managers
  const canSeeOfficial = role === "ADMIN" || role === "MANAGER";
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.loading;

  return (
    <>
      <RailCard title="Connection">
        <RailRow label="Status">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", s.dot)} />
            {s.label}
          </span>
        </RailRow>
        {phone && <RailRow label="Number">{phone}</RailRow>}
      </RailCard>
      <RailCard title="How to link">
        <ol className="space-y-2.5">
          {LINK_STEPS.map((step, i) => (
            <li key={step} className="flex gap-2.5 text-label text-on-surface-variant">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {canSeeOfficial && (
          <p className="mt-3 text-label text-on-surface-variant">
            No phone to scan with?{" "}
            <a href="#official-api" className="font-medium text-primary hover:underline">
              Use the official API
            </a>
          </p>
        )}
      </RailCard>
    </>
  );
}

export default function WhatsAppSettingsPage() {
  usePageTitle("WhatsApp");
  // Connected: one wide card with its own sections. Linking / disconnected: the card plus a side panel.
  const connected = useWhatsAppStore((s) => s.status === "connected");

  return (
    <div className="flex-1 space-y-5 p-6">
      <PageHeader title="WhatsApp connection" className="max-lg:hidden" />
      {/* One tree for both states so the panel keeps its state when the status changes */}
      <FormWithRail
        className={cn(
          "max-lg:[&>aside]:hidden",
          connected ? "max-w-5xl xl:grid-cols-1 [&>aside]:hidden" : "max-w-2xl xl:max-w-[62rem]",
        )}
        rail={connected ? null : <LinkRail />}
      >
        {/* Official number (org-wide) first, then the person's own QR-linked number */}
        <div id="official-api" className="scroll-mt-[calc(var(--header-height)+1rem)] empty:hidden">
          <OfficialNumberCard />
        </div>
        <Card className={cn("w-full", connected && "p-0")}>
          <WhatsAppConnectionPanel />
        </Card>
      </FormWithRail>
    </div>
  );
}
