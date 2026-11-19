"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DisconnectButtonProps {
  onDisconnect: () => void;
  loading?: boolean;
  className?: string;
}

/** Ghost "Disconnect" button that asks for confirmation in a dialog. */
export function DisconnectButton({ onDisconnect, loading, className }: DisconnectButtonProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className={className}
      >
        <LogOut className="h-4 w-4 text-error" aria-hidden />
        <span className="text-error">Disconnect</span>
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Disconnect WhatsApp?"
        message="This ends your WhatsApp session in Wazelo."
        confirmLabel="Disconnect"
        loading={loading}
        onConfirm={() => {
          onDisconnect();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
