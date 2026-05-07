"use client";

import { useState } from "react";
import { FileText, Send, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTemplates, useSyncTemplates, useSendTemplate } from "@/hooks/use-templates";
import type { MessageTemplate } from "@/lib/types/templates";

interface TemplateSelectorProps {
  channelId: string;
  contactPhone: string;
  conversationId?: string;
  onClose: () => void;
  onSent: () => void;
}

export function TemplateSelector({
  channelId,
  contactPhone,
  conversationId,
  onClose,
  onSent,
}: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates("APPROVED");
  const syncTemplates = useSyncTemplates();
  const sendTemplate = useSendTemplate();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Extract variable placeholders from template body
  const getVariableSlots = (template: MessageTemplate): string[] => {
    const slots: string[] = [];
    for (const comp of template.components) {
      if (comp.type === "BODY" && comp.text) {
        const matches = comp.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          for (const m of matches) {
            slots.push(m.replace(/\{|\}/g, ""));
          }
        }
      }
    }
    return [...new Set(slots)];
  };

  const handleSend = () => {
    if (!selectedTemplate) return;
    sendTemplate.mutate(
      {
        channelId,
        templateId: selectedTemplate.id,
        contactPhone,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        conversationId,
        idempotencyKey: `tpl-${selectedTemplate.id}-${contactPhone}-${Date.now()}`,
      },
      {
        onSuccess: () => {
          onSent();
          onClose();
        },
      },
    );
  };

  // Template detail view
  if (selectedTemplate) {
    const slots = getVariableSlots(selectedTemplate);
    const bodyText =
      selectedTemplate.components.find((c) => c.type === "BODY")?.text || "";

    return (
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-on-surface">
            {selectedTemplate.name}
          </h4>
          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
            Back
          </Button>
        </div>

        <div className="rounded-xl bg-surface-container p-3 mb-3">
          <p className="text-sm text-on-surface whitespace-pre-wrap">{bodyText}</p>
        </div>

        {slots.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium text-on-surface-variant">
              Variables
            </p>
            {slots.map((slot) => (
              <Input
                key={slot}
                placeholder={`Variable {{${slot}}}`}
                value={variables[slot] || ""}
                onChange={(e) =>
                  setVariables({ ...variables, [slot]: e.target.value })
                }
              />
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sendTemplate.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send Template
          </Button>
        </div>
      </div>
    );
  }

  // Template list view
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-on-surface">
          Message Templates
        </h4>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncTemplates.mutate(channelId)}
            loading={syncTemplates.isPending}
            title="Sync templates from Meta"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-on-surface-variant py-4 text-center">
          Loading templates...
        </p>
      ) : !templates || templates.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="h-8 w-8 text-on-surface-variant/30 mx-auto mb-2" />
          <p className="text-xs text-on-surface-variant">
            No approved templates found. Sync from Meta to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {templates.map((tpl) => {
            const body =
              tpl.components.find((c) => c.type === "BODY")?.text || "";
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-on-surface">
                    {tpl.name}
                  </span>
                  <Badge variant="muted">{tpl.language}</Badge>
                  {tpl.category && (
                    <Badge variant="default">{tpl.category}</Badge>
                  )}
                </div>
                <p className="text-[12px] text-on-surface-variant/70 truncate mt-0.5">
                  {body}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
