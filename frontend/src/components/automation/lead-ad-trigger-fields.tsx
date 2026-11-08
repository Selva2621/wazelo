"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface LeadAdTriggerValue {
  platform?: string;
  formId?: string;
  newContactsOnly?: boolean;
}

interface LeadAdTriggerFieldsProps {
  value: LeadAdTriggerValue;
  onChange: (key: keyof LeadAdTriggerValue, value: string | boolean | undefined) => void;
  inputClassName: string;
}

/** Filters for "Lead Ad Received": which platform / form, and whether repeat leads count */
export function LeadAdTriggerFields({ value, onChange, inputClassName }: LeadAdTriggerFieldsProps) {
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
          <Label htmlFor="triggerConfig.formId">Form ID (optional)</Label>
          <input
            id="triggerConfig.formId"
            className={inputClassName}
            placeholder="Any form"
            value={value.formId ?? ""}
            onChange={(e) => onChange("formId", e.target.value.trim() || undefined)}
          />
        </div>
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
