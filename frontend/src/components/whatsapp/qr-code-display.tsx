"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** The server sends the next QR on its own; only offer Refresh if it is this late */
const NEXT_QR_GRACE_S = 10;

interface QrCodeDisplayProps {
  qrCode: string | null;
  expiresAt: number | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** The phone scanned the code; WhatsApp is finishing the login */
  scanned?: boolean;
  /** The server stopped making codes — only Refresh brings a new one */
  stopped?: boolean;
  className?: string;
}

export function QrCodeDisplay({
  qrCode,
  expiresAt,
  onRefresh,
  isRefreshing,
  scanned,
  stopped,
  className,
}: QrCodeDisplayProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const totalRef = useRef(1);

  useEffect(() => {
    if (!expiresAt) return;
    totalRef.current = Math.max(1, Math.round((expiresAt - Date.now()) / 1000));

    const update = () => {
      setSecondsLeft(Math.floor((expiresAt - Date.now()) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (scanned) {
    return (
      <div className={cn("flex flex-col items-center gap-4 py-6 text-center", className)}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-container">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <div>
          <h3 className="text-title-sm font-medium text-on-surface mb-1">QR scanned</h3>
          <p className="text-body text-on-surface-variant max-w-[320px]">
            Finishing login. Keep WhatsApp open on your phone. You can close this window; it will still connect.
          </p>
        </div>
        <Spinner size="md" className="text-primary" />
      </div>
    );
  }

  const live = Boolean(qrCode) && expiresAt !== null && secondsLeft > 0;
  // Code ran out but the next one is on its way
  const waitingForNext =
    Boolean(qrCode) && expiresAt !== null && !live && secondsLeft > -NEXT_QR_GRACE_S && !stopped;
  const showRefresh = stopped || (!live && !waitingForNext && !isRefreshing);
  const progress = live ? Math.min(1, secondsLeft / totalRef.current) : 0;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      {/* QR Code container with timer ring */}
      <div className="relative">
        {live && (
          <svg
            className="absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)]"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="var(--surface-container)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 47}`}
              strokeDashoffset={`${2 * Math.PI * 47 * (1 - progress)}`}
              transform="rotate(-90 50 50)"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
        )}

        {/* QR display area */}
        <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-2xl bg-white p-4">
          {live ? (
            <img
              src={qrCode!}
              alt="WhatsApp QR Code"
              className="h-full w-full object-contain"
            />
          ) : isRefreshing || waitingForNext || (!qrCode && !stopped && expiresAt === null) ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Spinner size="lg" className="text-primary" />
              <p className="text-body text-on-surface-variant">
                {waitingForNext ? "Getting a new code..." : "Waiting for QR code..."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center opacity-60">
              <QrCode className="h-12 w-12 text-on-surface-variant" />
              <p className="text-body text-on-surface-variant">QR code expired</p>
            </div>
          )}
        </div>
      </div>

      {live && (
        <p className="text-body text-on-surface-variant">
          Expires in <span className="font-medium text-on-surface">{secondsLeft}s</span>
        </p>
      )}

      {showRefresh && (
        <Button variant="ghost" size="sm" onClick={onRefresh} loading={isRefreshing}>
          <RefreshCw className="h-4 w-4" />
          Refresh QR Code
        </Button>
      )}
    </div>
  );
}
