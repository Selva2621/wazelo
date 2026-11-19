"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import type { WhatsAppSession } from "@/lib/api/whatsapp";
import { Button } from "@/components/ui/button";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { DisconnectButton } from "@/components/whatsapp/disconnect-button";
import { AccountHealthSection } from "@/components/whatsapp/account-health";
import { BrowserPushCard } from "@/components/notifications/browser-push-card";

interface WhatsAppConnectedOverviewProps {
  session: WhatsAppSession;
  onReconnect: () => void;
  reconnecting?: boolean;
  onDisconnect: () => void;
  disconnecting?: boolean;
}

/**
 * Settings › WhatsApp when the number is linked: one wide card —
 * status + actions on top, connection details and account health side by side.
 */
export function WhatsAppConnectedOverview({
  session,
  onReconnect,
  reconnecting,
  onDisconnect,
  disconnecting,
}: WhatsAppConnectedOverviewProps) {
  const router = useRouter();

  return (
    <div>
      {/* Status + actions */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success-container">
            <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title-sm font-semibold text-on-surface">WhatsApp connected</h2>
              <SessionStatusBadge status="CONNECTED" />
            </div>
            {session.phoneNumber && (
              <p className="mt-0.5 text-body-lg font-medium tabular-nums text-on-surface">
                {session.phoneNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => router.push("/inbox")}>
            Go to Inbox
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            onClick={onReconnect}
            loading={reconnecting}
            title="Restart the connection without scanning a QR code"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reconnect
          </Button>
          <DisconnectButton onDisconnect={onDisconnect} loading={disconnecting} />
        </div>
      </header>

      {/* Details | Account health */}
      <div className="grid border-t border-outline-variant/40 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-labelledby="wa-connection-details"
          className="border-outline-variant/40 p-5 max-md:border-b sm:p-6 md:border-r"
        >
          <h3 id="wa-connection-details" className="mb-4 text-title-sm font-semibold text-on-surface">
            Connection
          </h3>
          <dl className="space-y-3 text-body">
            <DetailRow label="Connected since">
              {new Date(session.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </DetailRow>
            <DetailRow label="Last active">
              {session.lastActiveAt ? formatTimeAgo(new Date(session.lastActiveAt)) : "—"}
            </DetailRow>
            <DetailRow label="On your phone">Wazelo CRM, under Linked devices</DetailRow>
          </dl>

          <BrowserPushCard
            variant="compact"
            className="mt-6 rounded-none border-t border-outline-variant/40 bg-transparent px-0 pb-0 pt-5"
          />
        </section>

        <AccountHealthSection className="p-5 sm:p-6" />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-3">
      <dt className="text-label text-on-surface-variant">{label}</dt>
      <dd className="min-w-0 text-on-surface">{children}</dd>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
