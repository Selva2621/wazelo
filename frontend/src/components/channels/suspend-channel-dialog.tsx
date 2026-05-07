"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SuspendChannelDialogProps {
  open: boolean;
  channelName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SuspendChannelDialog({
  open,
  channelName,
  onConfirm,
  onCancel,
  loading,
}: SuspendChannelDialogProps) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-surface-container-low p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-on-surface mb-1">
          Suspend Channel
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Suspend <span className="font-medium text-on-surface">{channelName}</span>?
          No messages will be sent or received while suspended.
        </p>

        <label className="block text-sm font-medium text-on-surface mb-1.5">
          Reason <span className="text-error">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this channel being suspended?"
          rows={3}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            loading={loading}
          >
            Suspend
          </Button>
        </div>
      </div>
    </div>
  );
}
