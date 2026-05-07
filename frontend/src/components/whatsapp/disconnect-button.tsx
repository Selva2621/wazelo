"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DisconnectButtonProps {
  onDisconnect: () => void;
  loading?: boolean;
  className?: string;
}

export function DisconnectButton({ onDisconnect, loading, className }: DisconnectButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className={className}>
        <p className="text-[13px] text-on-surface-variant mb-2">
          Are you sure? This will end your WhatsApp session.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDisconnect();
              setConfirming(false);
            }}
            loading={loading}
          >
            Yes, Disconnect
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className={className}
    >
      <LogOut className="h-4 w-4 text-error" />
      <span className="text-error">Disconnect</span>
    </Button>
  );
}
