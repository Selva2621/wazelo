"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAssignContact, useOrgMembers } from "@/hooks/use-contacts";

interface AssignOwnerModalProps {
  contactId: string;
  currentOwnerId: string;
  open: boolean;
  onClose: () => void;
}

export function AssignOwnerModal({
  contactId,
  currentOwnerId,
  open,
  onClose,
}: AssignOwnerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const assignContact = useAssignContact();
  const { data: members } = useOrgMembers();

  function handleAssign() {
    if (!selectedId) { setError("Please select a team member to assign."); return; }
    setError("");
    assignContact.mutate(
      {
        contactId,
        ownerId: selectedId,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedId(null);
          setReason("");
          setError("");
          onClose();
        },
        onError: (err) => setError((err as Error).message || "Failed to assign owner."),
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-on-surface">
            Assign Owner
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {(members ?? []).map((member) => {
            const isCurrent = member.id === currentOwnerId;
            const isSelected = member.id === selectedId;

            return (
              <button
                key={member.id}
                onClick={() => !isCurrent && setSelectedId(member.id)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : isCurrent
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-surface-container-low cursor-pointer"
                }`}
              >
                <Avatar
                  name={`${member.firstName} ${member.lastName}`}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-on-surface truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/60 truncate">
                    {member.email}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-[11px] text-on-surface-variant/50">
                    Current
                  </span>
                )}
                {isSelected && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
            className="w-full rounded-xl bg-surface-container-low px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary/40 resize-none"
          />
        </div>

        {error && (
          <p className="text-[12px] text-error bg-error/8 border border-error/15 px-3 py-2 rounded-lg mt-3">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId}
            loading={assignContact.isPending}
            className="flex-1"
          >
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}
