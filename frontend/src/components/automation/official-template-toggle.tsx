"use client";

import { useState } from "react";
import { CloudTemplateFields } from "@/components/whatsapp/cloud-template-fields";
import { useCloudTemplates } from "@/hooks/use-cloud-numbers";

interface OfficialTemplateToggleProps {
  /** The action's live config (messageBody, templateId, templateParams, headerImageUrl…) */
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  chips?: { label: string; value: string }[];
}

const CLEAR = { templateId: undefined, templateParams: undefined, headerImageUrl: undefined };

/**
 * "Write text" or "Approved template" for a WhatsApp send. Only shown once the workspace
 * has approved templates (official numbers). Official numbers need a template to start a
 * chat or write after 24 hours; QR numbers send the template's text.
 */
export function OfficialTemplateToggle({ config, onChange, chips }: OfficialTemplateToggleProps) {
  const { data: templates } = useCloudTemplates();
  const hasTemplate = typeof config.templateId === "string" && config.templateId !== "";
  const [mode, setMode] = useState<"text" | "template">(hasTemplate ? "template" : "text");

  if (!hasTemplate && !(templates?.length)) return null;

  const tab = (m: "text" | "template", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        if (m === "text") onChange(CLEAR);
      }}
      className={`rounded-md px-3 py-1.5 text-label font-medium transition-colors ${
        mode === m ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
      }`}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-surface-container p-0.5">
        {tab("text", "Write text")}
        {tab("template", "Approved template")}
      </div>
      {mode === "template" && (
        <>
          <p className="text-caption text-on-surface-variant">
            Official numbers need an approved template to message someone first or after 24 hours.
          </p>
          <CloudTemplateFields
            value={
              hasTemplate
                ? {
                    templateId: config.templateId as string,
                    params: Array.isArray(config.templateParams) ? (config.templateParams as string[]) : [],
                    headerImageUrl: (config.headerImageUrl as string) || undefined,
                  }
                : null
            }
            onChange={(choice) =>
              onChange(
                choice
                  ? { templateId: choice.templateId, templateParams: choice.params, headerImageUrl: choice.headerImageUrl }
                  : CLEAR,
              )
            }
            chips={chips}
          />
        </>
      )}
    </div>
  );
}
