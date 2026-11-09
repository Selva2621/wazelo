"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLeadAdForms } from "@/hooks/use-lead-ads";
import type { LeadAdForm } from "@/lib/api/lead-ads";

export interface LeadAdTriggerValue {
  platform?: string;
  pageId?: string;
  formId?: string;
  newContactsOnly?: boolean;
}

interface LeadAdTriggerFieldsProps {
  value: LeadAdTriggerValue;
  onChange: (key: keyof LeadAdTriggerValue, value: string | boolean | undefined) => void;
  inputClassName: string;
}

const CUSTOM = "__custom";

function pageLabel(f: Pick<LeadAdForm, "pageId" | "pageName">) {
  if (f.pageId === "dev-test") return "Test leads";
  return f.pageName || `Page ${f.pageId}`;
}

function formLabel(f: LeadAdForm) {
  const leads = `${f.leads} lead${f.leads === 1 ? "" : "s"}`;
  return `${f.campaignName || "Form"} · ${f.formId} · ${leads}`;
}

/**
 * Filters for "Lead Ad Received": platform, Facebook Page (a brand) and form (a product),
 * and whether repeat leads count. Pages and forms are picked from leads already received;
 * an ID can still be typed for a form that hasn't sent a lead yet.
 */
export function LeadAdTriggerFields({ value, onChange, inputClassName }: LeadAdTriggerFieldsProps) {
  const { data: forms = [], isLoading } = useLeadAdForms();
  const [typePage, setTypePage] = useState(false);
  const [typeForm, setTypeForm] = useState(false);

  const pages = [...new Map(forms.map((f) => [f.pageId, f])).values()];
  const pageKnown = !value.pageId || pages.some((p) => p.pageId === value.pageId);
  const pageForms = forms.filter(
    (f) => (!value.pageId || f.pageId === value.pageId) && (!value.platform || f.platform === value.platform),
  );
  const formKnown = !value.formId || forms.some((f) => f.formId === value.formId);
  // Until the list loads, a saved page/form isn't "unknown" yet (no flash of a text box)
  const showPageInput = typePage || (!isLoading && (!pageKnown || pages.length === 0));
  const showFormInput = typeForm || (!isLoading && (!formKnown || forms.length === 0));

  function pickPage(pageId: string) {
    if (pageId === CUSTOM) return setTypePage(true);
    onChange("pageId", pageId || undefined);
    // A form from another page would never match
    const form = forms.find((f) => f.formId === value.formId);
    if (pageId && form && form.pageId !== pageId) onChange("formId", undefined);
  }

  function pickForm(formId: string) {
    if (formId === CUSTOM) return setTypeForm(true);
    onChange("formId", formId || undefined);
  }

  return (
    <div className="space-y-3" data-tour="rule-lead-filters">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div>
          <Label htmlFor="triggerConfig.platform">Platform</Label>
          <Select
            id="triggerConfig.platform"
            className="mt-1"
            value={value.platform ?? ""}
            onValueChange={(v) => onChange("platform", v || undefined)}
          >
            <option value="">Any platform</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="triggerConfig.pageId">Facebook Page</Label>
          {showPageInput ? (
            <input
              id="triggerConfig.pageId"
              className={inputClassName}
              placeholder="Any page (or paste a Page ID)"
              value={value.pageId ?? ""}
              onChange={(e) => onChange("pageId", e.target.value.trim() || undefined)}
            />
          ) : (
            <Select id="triggerConfig.pageId" className="mt-1" value={value.pageId ?? ""} onValueChange={pickPage}>
              <option value="">Any page</option>
              {value.pageId && !pageKnown && <option value={value.pageId}>{pageLabel({ pageId: value.pageId, pageName: null })}</option>}
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>{pageLabel(p)}</option>
              ))}
              <option value={CUSTOM}>Enter a Page ID…</option>
            </Select>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="triggerConfig.formId">Lead form</Label>
        {showFormInput ? (
          <input
            id="triggerConfig.formId"
            className={inputClassName}
            placeholder="Any form (or paste a form ID)"
            value={value.formId ?? ""}
            onChange={(e) => onChange("formId", e.target.value.trim() || undefined)}
          />
        ) : (
          <Select id="triggerConfig.formId" className="mt-1" value={value.formId ?? ""} onValueChange={pickForm}>
            <option value="">Any form{value.pageId ? " on this page" : ""}</option>
            {value.formId && !formKnown && <option value={value.formId}>{value.formId}</option>}
            {pageForms.map((f) => (
              <option key={`${f.pageId}-${f.formId}`} value={f.formId}>{formLabel(f)}</option>
            ))}
            <option value={CUSTOM}>Enter a form ID…</option>
          </Select>
        )}
        <p className="text-caption text-on-surface-variant/60 mt-1">
          {forms.length === 0 && !isLoading
            ? "Pages and forms show up here after their first lead."
            : "One brand = one Page, one product = one form."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p id="lead-new-only" className="text-body text-on-surface">New contacts only</p>
          <p className="text-caption text-on-surface-variant/60">Skip people who are already contacts.</p>
        </div>
        <Switch
          aria-labelledby="lead-new-only"
          checked={value.newContactsOnly === true}
          onChange={(c) => onChange("newContactsOnly", c || undefined)}
        />
      </div>
    </div>
  );
}
