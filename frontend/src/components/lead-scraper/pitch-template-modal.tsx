"use client";

import { useState, useMemo } from "react";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTemplates } from "@/hooks/use-templates";
import { useChannels } from "@/hooks/use-channels";
import { templatesApi } from "@/lib/api/templates";
import type { MessageTemplate } from "@/lib/types/templates";
import type { ScrapeResult } from "@/lib/types/lead-scraper";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBodyText(tpl: MessageTemplate): string {
  return tpl.components.find((c) => c.type === "BODY")?.text ?? "";
}

function getVariableSlots(tpl: MessageTemplate): string[] {
  const body = getBodyText(tpl);
  const matches = body.match(/\{\{(\d+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{|\}/g, "")))];
}

function renderPreview(tpl: MessageTemplate, vars: Record<string, string>): string {
  let body = getBodyText(tpl);
  for (const [k, v] of Object.entries(vars)) {
    body = body.replaceAll(`{{${k}}}`, v || `{{${k}}}`);
  }
  return body;
}

// Auto-fill variable slots from scraped data
function autoFillVars(slots: string[], r: ScrapeResult): Record<string, string> {
  const fields = [
    r.name ?? "",
    r.company ?? r.category ?? "",
    r.jobTitle ?? r.budget ?? "",
    r.location ?? r.address ?? "",
    r.website ?? "",
  ];
  const out: Record<string, string> = {};
  slots.forEach((slot, i) => { out[slot] = fields[i] ?? ""; });
  return out;
}

const SLOT_LABELS: Record<string, string> = {
  "1": "Name",
  "2": "Company / Category",
  "3": "Job Title / Budget",
  "4": "Location",
  "5": "Website",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PitchTemplateModalProps {
  open: boolean;
  onClose: () => void;
  selectedResults: ScrapeResult[]; // must have phone + imported=true
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PitchTemplateModal({ open, onClose, selectedResults }: PitchTemplateModalProps) {
  const { data: templates, isLoading: tplLoading } = useTemplates("APPROVED");
  const { data: channels, isLoading: chLoading } = useChannels();

  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [done, setDone] = useState(false);

  const channel = channels?.[0] ?? null;
  const slots = useMemo(() => (selectedTemplate ? getVariableSlots(selectedTemplate) : []), [selectedTemplate]);
  const preview = selectedTemplate ? renderPreview(selectedTemplate, vars) : "";

  const handleSelectTemplate = (tpl: MessageTemplate) => {
    setSelectedTemplate(tpl);
    const first = selectedResults[0];
    if (first) setVars(autoFillVars(getVariableSlots(tpl), first));
  };

  const handleSend = async () => {
    if (!selectedTemplate || !channel) return;
    setSending(true);
    setSentCount(0);
    let sent = 0;
    for (const result of selectedResults) {
      if (!result.phone) continue;
      try {
        await templatesApi.send({
          channelId: channel.id,
          templateId: selectedTemplate.id,
          contactPhone: result.phone,
          variables: Object.keys(vars).length > 0 ? vars : undefined,
          idempotencyKey: `pitch-${selectedTemplate.id}-${result.id}-${Date.now()}`,
        });
        sent++;
        setSentCount(sent);
      } catch { /* skip individual failures */ }
    }
    setSending(false);
    setDone(true);
    toast.success(`Pitch sent to ${sent} contact${sent !== 1 ? "s" : ""}`);
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setVars({});
    setSending(false);
    setSentCount(0);
    setDone(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Send Pitch</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {selectedResults.length} contact{selectedResults.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button onClick={handleClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {done ? (
            /* ─── Done state ─── */
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <p className="text-base font-semibold text-on-surface">Pitches Sent!</p>
              <p className="text-sm text-on-surface-variant">
                Sent to {sentCount} of {selectedResults.length} contacts.
              </p>
              <button
                onClick={handleClose}
                className="mt-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* No channel warning */}
              {!chLoading && !channel && (
                <div className="bg-error/5 border border-error/20 rounded-xl px-4 py-3 text-sm text-error">
                  No active WhatsApp channel found. Connect one in Settings → WhatsApp first.
                </div>
              )}

              {/* Template list */}
              <div>
                <label className="text-xs font-medium text-on-surface-variant block mb-2">Select Template</label>
                {tplLoading ? (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
                  </div>
                ) : !templates?.length ? (
                  <p className="text-sm text-on-surface-variant">
                    No approved templates. Create one in Settings → Templates.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-xl border transition-all ${
                          selectedTemplate?.id === tpl.id
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant hover:border-primary/40 bg-surface-container-low"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface">{tpl.name}</p>
                          <p className="text-xs text-on-surface-variant truncate mt-0.5">
                            {getBodyText(tpl).slice(0, 90)}
                          </p>
                        </div>
                        {selectedTemplate?.id === tpl.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Variable mapping */}
              {selectedTemplate && slots.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-on-surface-variant block mb-2">
                    Variable Values
                    <span className="ml-1 font-normal text-on-surface-variant/60">
                      — auto-filled from first lead, applied to all
                    </span>
                  </label>
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div key={slot} className="flex items-center gap-3">
                        <span className="text-xs text-on-surface-variant w-36 shrink-0">
                          {`{{${slot}}}`} — {SLOT_LABELS[slot] ?? `Field ${slot}`}
                        </span>
                        <input
                          type="text"
                          value={vars[slot] ?? ""}
                          onChange={(e) => setVars((p) => ({ ...p, [slot]: e.target.value }))}
                          placeholder={SLOT_LABELS[slot] ?? `Value for {{${slot}}}`}
                          className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {selectedTemplate && preview && (
                <div>
                  <label className="text-xs font-medium text-on-surface-variant block mb-2">Message Preview</label>
                  <div className="bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface whitespace-pre-wrap border border-outline-variant/20 leading-relaxed">
                    {preview}
                  </div>
                </div>
              )}

              {/* Sending progress */}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Sending {sentCount} / {selectedResults.length}…
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-outline-variant/20">
            <button
              onClick={handleClose}
              disabled={sending}
              className="text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-xl hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!selectedTemplate || !channel || sending || selectedResults.length === 0}
              className="flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to {selectedResults.length} Contact{selectedResults.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
