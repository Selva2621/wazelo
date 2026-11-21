"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCloudTemplates } from "@/hooks/use-cloud-numbers";
import type { CloudTemplateChoice } from "@/lib/api/whatsapp";

const inputCls =
  "mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-body text-on-surface placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30";

interface Chip {
  label: string;
  value: string;
}

interface CloudTemplateFieldsProps {
  /** Only this official number's templates (all official numbers when empty) */
  sessionId?: string;
  value: CloudTemplateChoice | null;
  onChange: (value: CloudTemplateChoice | null) => void;
  /** Variable chips that can go into a slot ({{name}}, {{lead.campaign}}…) */
  chips?: Chip[];
  error?: string;
  /** Text for the "no template" option */
  noneLabel?: string;
}

/**
 * Pick a Meta-approved template for an official number and fill its {{1}}, {{2}}… slots.
 * Shows the message as it will read, with the slot values in place.
 */
export function CloudTemplateFields({ sessionId, value, onChange, chips = [], error, noneLabel }: CloudTemplateFieldsProps) {
  const { data: templates, isLoading } = useCloudTemplates(sessionId);
  const selected = templates?.find((t) => t.id === value?.templateId);

  const preview = useMemo(() => {
    if (!selected) return "";
    return selected.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, n: string) => value?.params[Number(n) - 1]?.trim() || whole);
  }, [selected, value]);

  function pick(id: string) {
    if (!id) return onChange(null);
    const t = templates?.find((x) => x.id === id);
    onChange({ templateId: id, params: Array.from({ length: t?.paramCount ?? 0 }, () => "") });
  }

  function setParam(i: number, v: string) {
    if (!value) return;
    const params = [...value.params];
    params[i] = v;
    onChange({ ...value, params });
  }

  if (!isLoading && (templates?.length ?? 0) === 0) {
    return (
      <div className="rounded-lg bg-surface-container-low px-3 py-2.5 text-body text-on-surface-variant">
        No approved templates yet. Create one in Meta WhatsApp Manager, then press <b>Sync templates</b> in{" "}
        <Link href="/settings/whatsapp" className="text-primary hover:underline">Settings → WhatsApp</Link>.
        {error && <p className="mt-1 text-caption text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Approved template</Label>
        <Select value={value?.templateId ?? ""} onValueChange={pick} className="mt-1" disabled={isLoading}>
          <option value="">{isLoading ? "Loading templates…" : noneLabel ?? "Choose a template"}</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.language}){t.category ? ` · ${t.category.toLowerCase()}` : ""}
            </option>
          ))}
        </Select>
        {error && <p className="mt-1 text-caption text-error">{error}</p>}
      </div>

      {selected && (
        <>
          {selected.paramCount > 0 && (
            <div className="space-y-2">
              {Array.from({ length: selected.paramCount }, (_, i) => (
                <div key={i}>
                  <Label htmlFor={`tpl-param-${i}`}>{`{{${i + 1}}}`}</Label>
                  <input
                    id={`tpl-param-${i}`}
                    className={inputCls}
                    value={value?.params[i] ?? ""}
                    placeholder={i === 0 ? "{{name}}" : "Text or a variable"}
                    onChange={(e) => setParam(i, e.target.value)}
                  />
                  {chips.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {chips.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setParam(i, `${value?.params[i] ?? ""}${c.value}`)}
                          className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-caption text-primary hover:bg-primary/20"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selected.needsHeaderImage && (
            <div>
              <Label htmlFor="tpl-header">Header image link</Label>
              <input
                id="tpl-header"
                type="url"
                className={inputCls}
                placeholder="https://…/photo.jpg"
                value={value?.headerImageUrl ?? ""}
                onChange={(e) => value && onChange({ ...value, headerImageUrl: e.target.value || undefined })}
              />
            </div>
          )}

          <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low px-3 py-2.5">
            <p className="text-caption font-medium text-on-surface-variant">Preview</p>
            <p className="mt-1 whitespace-pre-wrap text-body text-on-surface">{preview}</p>
          </div>
        </>
      )}
    </div>
  );
}
