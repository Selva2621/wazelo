"use client";

import { useState, useEffect, useCallback } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface QrCodeDisplayProps {
  qrCode: string | null;
  expiresAt: number | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function QrCodeDisplay({
  qrCode,
  expiresAt,
  onRefresh,
  isRefreshing,
  className,
}: QrCodeDisplayProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const expired = secondsLeft <= 0 && expiresAt !== null;

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const progress = expiresAt
    ? Math.max(0, secondsLeft / 20)
    : 0;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      {/* QR Code container with timer ring */}
      <div className="relative">
        {/* Countdown ring */}
        {qrCode && !expired && (
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
        <div
          className={cn(
            "relative flex h-[260px] w-[260px] items-center justify-center rounded-2xl bg-white p-4",
            expired && "opacity-40",
          )}
        >
          {qrCode && !expired ? (
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="h-full w-full object-contain"
            />
          ) : isRefreshing ? (
            <Spinner size="lg" className="text-primary" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <QrCode className="h-12 w-12 text-gray-400" />
              <p className="text-[13px] text-gray-500">
                {expired ? "QR code expired" : "Waiting for QR code..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timer text */}
      {qrCode && !expired && (
        <p className="text-[13px] text-on-surface-variant">
          Expires in <span className="font-medium text-on-surface">{secondsLeft}s</span>
        </p>
      )}

      {/* Refresh button */}
      {(expired || (!qrCode && !isRefreshing)) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          loading={isRefreshing}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh QR Code
        </Button>
      )}
    </div>
  );
}
