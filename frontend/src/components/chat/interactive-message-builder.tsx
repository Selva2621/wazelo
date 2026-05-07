"use client";

import { useState } from "react";
import { X, Plus, Trash2, MousePointerClick, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InteractivePayload, InteractiveButton, InteractiveListSection } from "@/lib/types/inbox";

interface InteractiveMessageBuilderProps {
  onSend: (payload: InteractivePayload) => void;
  onClose: () => void;
}

type InteractiveType = "button" | "list";

export function InteractiveMessageBuilder({ onSend, onClose }: InteractiveMessageBuilderProps) {
  const [type, setType] = useState<InteractiveType>("button");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<InteractiveButton[]>([{ id: "btn-1", title: "" }]);
  const [sections, setSections] = useState<InteractiveListSection[]>([
    { title: "", rows: [{ id: "row-1", title: "", description: "" }] },
  ]);
  const [buttonText, setButtonText] = useState("Choose");

  const canSend = () => {
    if (!body.trim()) return false;
    if (type === "button") {
      return buttons.length > 0 && buttons.every((b) => b.title.trim());
    }
    if (type === "list") {
      return sections.length > 0 && sections.every((s) => s.rows.length > 0 && s.rows.every((r) => r.title.trim()));
    }
    return false;
  };

  const handleSend = () => {
    if (!canSend()) return;
    const payload: InteractivePayload = {
      type,
      body: body.trim(),
      footer: footer.trim() || undefined,
    };
    if (type === "button") {
      payload.buttons = buttons.map((b, i) => ({ id: b.id || `btn-${i + 1}`, title: b.title.trim() }));
    } else {
      payload.sections = sections.map((s, si) => ({
        title: s.title?.trim() || undefined,
        rows: s.rows.map((r, ri) => ({
          id: r.id || `row-${si}-${ri}`,
          title: r.title.trim(),
          description: r.description?.trim() || undefined,
        })),
      }));
      payload.buttonText = buttonText.trim() || "Choose";
    }
    onSend(payload);
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { id: `btn-${buttons.length + 1}`, title: "" }]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, title: string) => {
    setButtons(buttons.map((b, i) => (i === index ? { ...b, title } : b)));
  };

  const addSection = () => {
    setSections([...sections, { title: "", rows: [{ id: `row-${sections.length}-0`, title: "", description: "" }] }]);
  };

  const addRow = (sectionIndex: number) => {
    const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
    if (totalRows >= 10) return;
    setSections(
      sections.map((s, i) =>
        i === sectionIndex
          ? { ...s, rows: [...s.rows, { id: `row-${i}-${s.rows.length}`, title: "", description: "" }] }
          : s,
      ),
    );
  };

  const removeRow = (si: number, ri: number) => {
    setSections(
      sections.map((s, i) => (i === si ? { ...s, rows: s.rows.filter((_, j) => j !== ri) } : s)),
    );
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-4 mb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-semibold text-on-surface">Interactive Message</h4>
        <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setType("button")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors",
            type === "button" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
          )}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          Buttons
        </button>
        <button
          onClick={() => setType("list")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors",
            type === "list" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
          )}
        >
          <List className="h-3.5 w-3.5" />
          List Menu
        </button>
      </div>

      {/* Body text */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body..."
        rows={2}
        maxLength={1024}
        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-2"
      />

      {/* Footer */}
      <input
        value={footer}
        onChange={(e) => setFooter(e.target.value)}
        placeholder="Footer text (optional)"
        maxLength={60}
        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[12px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mb-3"
      />

      {/* Button builder */}
      {type === "button" && (
        <div>
          <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">
            Buttons ({buttons.length}/3)
          </p>
          {buttons.map((btn, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <input
                value={btn.title}
                onChange={(e) => updateButton(i, e.target.value)}
                placeholder={`Button ${i + 1} label`}
                maxLength={20}
                className="flex-1 rounded-lg border border-outline-variant/30 bg-surface px-2.5 py-1.5 text-[12px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
              />
              {buttons.length > 1 && (
                <button onClick={() => removeButton(i)} className="p-1 text-on-surface-variant hover:text-error transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {buttons.length < 3 && (
            <button
              onClick={addButton}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium mt-1"
            >
              <Plus className="h-3 w-3" /> Add button
            </button>
          )}
        </div>
      )}

      {/* List builder */}
      {type === "list" && (
        <div>
          <input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Menu button text"
            maxLength={20}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[12px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mb-2"
          />
          <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">
            Sections &middot; {totalRows}/10 rows
          </p>
          {sections.map((section, si) => (
            <div key={si} className="mb-2 rounded-xl border border-outline-variant/15 bg-surface p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  value={section.title || ""}
                  onChange={(e) =>
                    setSections(sections.map((s, i) => (i === si ? { ...s, title: e.target.value } : s)))
                  }
                  placeholder="Section title (optional)"
                  maxLength={24}
                  className="flex-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-1 text-[11px] placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
                {sections.length > 1 && (
                  <button onClick={() => removeSection(si)} className="p-1 text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              {section.rows.map((row, ri) => (
                <div key={ri} className="flex items-start gap-1.5 mb-1">
                  <div className="flex-1 space-y-0.5">
                    <input
                      value={row.title}
                      onChange={(e) =>
                        setSections(
                          sections.map((s, i) =>
                            i === si
                              ? { ...s, rows: s.rows.map((r, j) => (j === ri ? { ...r, title: e.target.value } : r)) }
                              : s,
                          ),
                        )
                      }
                      placeholder="Row title"
                      maxLength={24}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-1 text-[11px] placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                    />
                    <input
                      value={row.description || ""}
                      onChange={(e) =>
                        setSections(
                          sections.map((s, i) =>
                            i === si
                              ? { ...s, rows: s.rows.map((r, j) => (j === ri ? { ...r, description: e.target.value } : r)) }
                              : s,
                          ),
                        )
                      }
                      placeholder="Description (optional)"
                      maxLength={72}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-1 text-[11px] placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                    />
                  </div>
                  {section.rows.length > 1 && (
                    <button onClick={() => removeRow(si, ri)} className="p-1 mt-0.5 text-on-surface-variant hover:text-error transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {totalRows < 10 && (
                <button
                  onClick={() => addRow(si)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium mt-1"
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSection}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="h-3 w-3" /> Add section
          </button>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend()}
        className={cn(
          "mt-3 w-full rounded-xl py-2 text-[13px] font-medium transition-colors",
          canSend()
            ? "bg-primary text-on-primary hover:bg-primary/90"
            : "bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed",
        )}
      >
        Send Interactive Message
      </button>
    </div>
  );
}
