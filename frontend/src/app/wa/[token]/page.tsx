"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Link2Off, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import { whatsappLinkApi, type WhatsAppLinkStatus } from "@/lib/api/whatsapp-link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { PairingCodeDisplay, PairingSteps } from "@/components/whatsapp/pairing-code-display";

const POLL_STATES: WhatsAppLinkStatus["state"][] = ["pairing", "reconnecting"];

/** Reconnect WhatsApp from the phone — opened from the link in a disconnect email, no login. */
export default function WhatsAppLinkPage() {
  const { token } = useParams<{ token: string }>();

  const status = useQuery({
    queryKey: ["whatsapp-link", token],
    queryFn: () => whatsappLinkApi.getStatus(token),
    retry: false,
    // Watch for the phone to finish linking
    refetchInterval: (q) => (POLL_STATES.includes(q.state.data?.state as never) ? 3000 : false),
  });

  const reconnect = useMutation({
    mutationFn: () => whatsappLinkApi.reconnect(token),
    onSettled: () => status.refetch(),
  });

  const pairing = useMutation({
    mutationFn: () => whatsappLinkApi.requestPairingCode(token),
    onSettled: () => status.refetch(),
  });

  const actionError = (reconnect.error ?? pairing.error)?.message;

  return (
    // Phones: full-width 48px buttons, easy to hit with a thumb
    <Card className="w-full max-w-[400px] p-6 text-center shadow-sm max-lg:rounded-2xl max-lg:px-5 max-lg:[&_button.w-full]:h-12 max-lg:[&_button.w-full]:text-body-lg">

      {status.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : status.isError || !status.data ? (
        <StateHeader
          icon={<Link2Off className="h-8 w-8 text-on-surface-variant" />}
          tone="neutral"
          title="This link has expired"
          text="Open Wazelo to reconnect WhatsApp."
        >
          <Button className="mt-6 w-full" onClick={() => (window.location.href = "/settings/whatsapp")}>
            Open Wazelo
          </Button>
        </StateHeader>
      ) : (
        <LinkState
          data={status.data}
          pairingCode={status.data.pairingCode ?? pairing.data?.pairingCode ?? null}
          onReconnect={() => reconnect.mutate()}
          reconnecting={reconnect.isPending}
          onPair={() => pairing.mutate()}
          pairingPending={pairing.isPending}
        />
      )}

      {actionError && (
        <Alert variant="error" className="mt-6 text-left">
          {actionError}
        </Alert>
      )}
    </Card>
  );
}

function LinkState({
  data,
  pairingCode,
  onReconnect,
  reconnecting,
  onPair,
  pairingPending,
}: {
  data: WhatsAppLinkStatus;
  pairingCode: string | null;
  onReconnect: () => void;
  reconnecting: boolean;
  onPair: () => void;
  pairingPending: boolean;
}) {
  const phone = data.phoneNumber;

  switch (data.state) {
    case "connected":
      return (
        <StateHeader
          icon={<CheckCircle2 className="h-8 w-8 text-success" />}
          tone="success"
          title="WhatsApp connected"
          text={phone ?? undefined}
        >
          <p className="mt-4 text-body text-on-surface-variant">You can close this page.</p>
        </StateHeader>
      );

    case "reconnecting":
      return (
        <div className="flex flex-col items-center py-6">
          <Spinner size="lg" className="mb-4 text-primary" />
          <h1 className="text-title-sm font-semibold text-on-surface">Reconnecting…</h1>
          {phone && <p className="mt-1 text-body text-on-surface-variant">{phone}</p>}
        </div>
      );

    case "reconnectable":
      return (
        <StateHeader
          icon={<WifiOff className="h-8 w-8 text-error" />}
          tone="error"
          title="WhatsApp disconnected"
          text={phone ?? undefined}
        >
          <Button className="mt-6 w-full" onClick={onReconnect} loading={reconnecting}>
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </Button>
        </StateHeader>
      );

    case "blocked":
      return (
        <StateHeader
          icon={<ShieldAlert className="h-8 w-8 text-error" />}
          tone="error"
          title="WhatsApp blocked this number"
          text="Open WhatsApp on your phone and tap “Request a review”."
        />
      );

    case "needs_pairing":
    case "pairing":
      return (
        <StateHeader
          icon={<WifiOff className="h-8 w-8 text-error" />}
          tone="error"
          title="Link WhatsApp again"
          text={phone ?? undefined}
        >
          {pairingCode ? (
            <div className="mt-6">
              <PairingCodeDisplay code={pairingCode} />
              <PairingSteps className="mt-6 text-left" />
              <Button variant="ghost" size="sm" className="mt-4 max-lg:h-11" onClick={onPair} loading={pairingPending}>
                Get a new code
              </Button>
            </div>
          ) : (
            <Button className="mt-6 w-full" onClick={onPair} loading={pairingPending}>
              Get pairing code
            </Button>
          )}
        </StateHeader>
      );
  }
}

function StateHeader({
  icon,
  tone,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  tone: "success" | "error" | "neutral";
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  const bg =
    tone === "success" ? "bg-success-container" : tone === "error" ? "bg-error-container" : "bg-surface-container";
  return (
    <div className="flex flex-col items-center">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${bg}`}>{icon}</div>
      <h1 className="text-title-sm font-semibold text-on-surface">{title}</h1>
      {text && <p className="mt-1 text-body text-on-surface-variant">{text}</p>}
      {children && <div className="w-full">{children}</div>}
    </div>
  );
}
