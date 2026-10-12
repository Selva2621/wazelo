"use client";

import { useRouter } from "next/navigation";
import {
  Smartphone,
  ScanLine,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import {
  useWhatsAppSession,
  useInitiateSession,
  useRefreshQr,
  useDisconnectSession,
  useReconnectSession,
  useWhatsAppSocket,
} from "@/hooks/use-whatsapp";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { DisconnectButton } from "@/components/whatsapp/disconnect-button";
import { AccountHealthCard } from "@/components/whatsapp/account-health";

interface WhatsAppConnectionPanelProps {
  /** Hides reconnect/disconnect and the account health card, for use inside a modal. */
  compact?: boolean;
}

/** Connect / QR / connected / disconnected states for the user's own WhatsApp session. */
export function WhatsAppConnectionPanel({ compact = false }: WhatsAppConnectionPanelProps) {
  const router = useRouter();

  // State
  const status = useWhatsAppStore((s) => s.status);
  const session = useWhatsAppStore((s) => s.session);
  const qrCode = useWhatsAppStore((s) => s.qrCode);
  const qrExpiresAt = useWhatsAppStore((s) => s.qrExpiresAt);
  const error = useWhatsAppStore((s) => s.error);

  // Queries & mutations
  const { isLoading } = useWhatsAppSession();
  const initiateSession = useInitiateSession();
  const refreshQr = useRefreshQr();
  const disconnectSession = useDisconnectSession();
  const reconnectSession = useReconnectSession();

  // WebSocket for QR & status events
  useWhatsAppSocket();

  const handleConnect = () => {
    initiateSession.mutate(crypto.randomUUID());
  };

  const handleReconnect = () => {
    if (session?.id) {
      // Session record exists with preserved creds — reconnect without re-scanning QR
      reconnectSession.mutate(session.id);
    } else {
      // No session record at all — need a fresh one (will show QR)
      initiateSession.mutate(crypto.randomUUID());
    }
  };

  const handleRefreshQr = () => {
    if (session?.id) {
      refreshQr.mutate(session.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <>
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* ─── No Session State ─── */}
      {status === "no_session" && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container">
            <Smartphone className="h-10 w-10 text-on-surface-variant" />
          </div>
          <h3 className="text-title-sm font-medium text-on-surface mb-2">
            No WhatsApp session
          </h3>
          <p className="text-body text-on-surface-variant max-w-[360px] mb-6">
            Connect your WhatsApp account by scanning a QR code with your phone.
          </p>
          <Button
            onClick={handleConnect}
            loading={initiateSession.isPending}
          >
            <ScanLine className="h-4 w-4" />
            Connect WhatsApp
          </Button>
        </div>
      )}

      {/* ─── Connecting / QR State ─── */}
      {status === "connecting" && (
        <div className="flex flex-col items-center py-4">
          <QrCodeDisplay
            qrCode={qrCode}
            expiresAt={qrExpiresAt}
            onRefresh={handleRefreshQr}
            isRefreshing={refreshQr.isPending}
          />

          {/* Instructions */}
          <div className="mt-8 w-full space-y-3">
            <p className="text-body font-medium text-on-surface-variant uppercase tracking-wider mb-3">
              How to connect
            </p>
            {[
              { step: "1", text: "Open WhatsApp on your phone" },
              { step: "2", text: "Go to Settings → Linked Devices" },
              { step: "3", text: "Tap 'Link a Device' and scan the QR code" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-label font-semibold text-primary">
                  {item.step}
                </span>
                <span className="text-body text-on-surface-variant">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {!qrCode && !refreshQr.isPending && (
            <p className="mt-6 text-body text-on-surface-variant animate-pulse">
              Waiting for QR code...
            </p>
          )}
        </div>
      )}

      {/* ─── Connected State ─── */}
      {status === "connected" && session && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-container">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-title font-semibold text-on-surface mb-1">
            WhatsApp Connected
          </h3>
          {session.phoneNumber && (
            <p className="text-body-lg font-medium text-on-surface mb-2">
              {session.phoneNumber}
            </p>
          )}
          <SessionStatusBadge status="CONNECTED" className="mb-4" />

          <div className="text-label text-on-surface-variant space-y-1 mb-6">
            <p>
              Connected since{" "}
              {new Date(session.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {session.lastActiveAt && (
              <p>
                Last active{" "}
                {formatTimeAgo(new Date(session.lastActiveAt))}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Button onClick={() => router.push("/inbox")}>
              Go to Inbox
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!compact && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleReconnect}
                  loading={reconnectSession.isPending}
                  title="Force reconnect the session without re-scanning QR"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
                <DisconnectButton
                  onDisconnect={() => disconnectSession.mutate()}
                  loading={disconnectSession.isPending}
                />
              </>
            )}
          </div>

          {!compact && <AccountHealthCard className="mt-8 bg-surface-container-low" />}
        </div>
      )}

      {/* ─── Reconnecting State ─── */}
      {status === "reconnecting" && (
        <div className="flex flex-col items-center py-8 text-center">
          <Spinner size="lg" className="text-primary mb-4" />
          <h3 className="text-title-sm font-medium text-on-surface mb-1">
            Reconnecting...
          </h3>
          <p className="text-body text-on-surface-variant">
            Attempting to restore your WhatsApp session
          </p>
        </div>
      )}

      {/* ─── Disconnected State ─── */}
      {status === "disconnected" && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
            <WifiOff className="h-8 w-8 text-error" />
          </div>
          <h3 className="text-title-sm font-medium text-on-surface mb-2">
            Session Disconnected
          </h3>
          {session?.phoneNumber && (
            <p className="text-body-lg font-medium text-on-surface mb-1">
              {session.phoneNumber}
            </p>
          )}
          {session?.disconnectReason === "BANNED" || session?.disconnectReason === "LOGGED_OUT" ? (
            <>
              <p className="text-body text-on-surface-variant max-w-[400px] mb-4">
                {session.disconnectReason === "BANNED"
                  ? "WhatsApp blocked this number."
                  : "This number was logged out — from your phone, or restricted by WhatsApp."}{" "}
                Campaigns and sequences on it are paused. Your contacts and chats are safe.
              </p>
              <ol className="text-label text-on-surface-variant text-left max-w-[400px] mb-6 list-decimal pl-5 space-y-1">
                <li>Open WhatsApp on your phone. If it shows a ban notice, tap “Request a review”.</li>
                <li>Link this number again, or a different one, below.</li>
                <li>Resume your paused campaigns and sequences — they move to the new number.</li>
              </ol>
              <Button onClick={handleConnect} loading={initiateSession.isPending}>
                <ScanLine className="h-4 w-4" />
                Link WhatsApp number
              </Button>
            </>
          ) : session?.disconnectReason === "REPLACED" && session?.hasCreds ? (
            <>
              <p className="text-body text-on-surface-variant max-w-[360px] mb-6">
                This number was opened in another session, so we disconnected. Reconnect when the other session is closed.
              </p>
              <Button onClick={handleReconnect} loading={reconnectSession.isPending}>
                <RefreshCw className="h-4 w-4" />
                Reconnect
              </Button>
            </>
          ) : session?.hasCreds ? (
            <>
              <p className="text-body text-on-surface-variant max-w-[360px] mb-6">
                Your session was disconnected. Click Reconnect to restore it — no QR scan needed.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReconnect}
                  loading={reconnectSession.isPending || initiateSession.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleConnect}
                  disabled={reconnectSession.isPending || initiateSession.isPending}
                >
                  <ScanLine className="h-4 w-4" />
                  New Session
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-body text-on-surface-variant max-w-[360px] mb-6">
                Your session was logged out from WhatsApp. Scan a new QR code to reconnect.
              </p>
              <Button
                onClick={handleConnect}
                loading={initiateSession.isPending}
              >
                <ScanLine className="h-4 w-4" />
                Connect WhatsApp
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
