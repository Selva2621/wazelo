"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { CloudTemplateFields } from "@/components/whatsapp/cloud-template-fields";
import { useCloudTemplates } from "@/hooks/use-cloud-numbers";
import type { CloudTemplateChoice } from "@/lib/api/whatsapp";

interface TemplateSendPanelProps {
  /** The chat's official number */
  sessionId: string;
  onSend: (choice: CloudTemplateChoice) => void;
  onClose: () => void;
}

/** Send a Meta-approved template from the chat (the only way back in after 24 hours) */
export function TemplateSendPanel({ sessionId, onSend, onClose }: TemplateSendPanelProps) {
  const { data: templates } = useCloudTemplates(sessionId);
  const [choice, setChoice] = useState<CloudTemplateChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = templates?.find((t) => t.id === choice?.templateId);

  function send() {
    if (!choice || !selected) return setError("Pick a template");
    if (selected.needsHeaderImage && !choice.headerImageUrl) return setError("Add the header image link");
    onSend(choice);
  }

  return (
    <div className="mb-2 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-body font-medium text-on-surface">Send an approved template</p>
          <p className="text-caption text-on-surface-variant">
            Needed when the customer hasn&apos;t written in the last 24 hours.
          </p>
        </div>
        <IconButton size="xs" onClick={onClose} aria-label="Close template picker">
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <CloudTemplateFields
        sessionId={sessionId}
        value={choice}
        onChange={(c) => { setChoice(c); setError(null); }}
        chips={[{ label: "{{name}}", value: "{{name}}" }]}
        error={error ?? undefined}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={send} disabled={!choice}>Send template</Button>
      </div>
    </div>
  );
}
