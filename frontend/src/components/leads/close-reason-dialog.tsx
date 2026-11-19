"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REASONS = ["No budget", "No reply", "Chose someone else", "Not a fit", "Timing"];

interface CloseReasonDialogProps {
  /** Name of the lead being closed; null keeps the dialog shut */
  leadName: string | null;
  onCancel: () => void;
  /** reason is undefined when the user skips */
  onConfirm: (reason?: string) => void;
}

/**
 * Asked when a lead moves to Closed: why it was lost. Saved on the status change, so the
 * lead's history (and later reports) can say why. Skipping is always allowed.
 */
export function CloseReasonDialog({ leadName, onCancel, onConfirm }: CloseReasonDialogProps) {
  return (
    <Modal open={leadName !== null} onClose={onCancel} className="max-w-md" aria-labelledby="close-reason-title">
      {() => <Body leadName={leadName ?? ""} onCancel={onCancel} onConfirm={onConfirm} />}
    </Modal>
  );
}

function Body({ leadName, onCancel, onConfirm }: { leadName: string; onCancel: () => void; onConfirm: (reason?: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const reason = [picked, note.trim()].filter(Boolean).join(" · ").slice(0, 500) || undefined;

  return (
    <>
      <div className="space-y-4 p-5">
        <div>
          <h2 id="close-reason-title" className="text-title-sm font-semibold text-on-surface">
            Close {leadName}?
          </h2>
          <p className="text-label text-on-surface-variant">Why was it lost? Helps you see patterns later.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={picked === r}
              onClick={() => setPicked(picked === r ? null : r)}
              className={cn(
                "h-8 rounded-full border px-3 text-label font-medium outline-none transition-colors duration-120 ease-standard focus-visible:ring-2 focus-visible:ring-focus",
                picked === r
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Add a note (optional)"
          aria-label="Note"
          className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body text-on-surface outline-none placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <ModalFooter className="flex items-center justify-end gap-2 border-t border-outline-variant px-5 py-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="mr-auto">
          Cancel
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onConfirm()}>
          Skip
        </Button>
        <Button size="sm" onClick={() => onConfirm(reason)} disabled={!reason}>
          Close lead
        </Button>
      </ModalFooter>
    </>
  );
}
