"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelIcon } from "./channel-icon";
import {
  CHANNEL_TYPE_LABELS,
  CHANNEL_CONFIG_FIELDS,
} from "@/lib/types/channels";
import type {
  ChannelType,
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "@/lib/types/channels";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

interface ChannelFormProps {
  channel?: Channel;
  onSubmit: (data: CreateChannelRequest | UpdateChannelRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CHANNEL_TYPES: ChannelType[] = [
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK_MESSENGER",
  "EMAIL",
];

const CHANNEL_DESCRIPTIONS: Record<ChannelType, string> = {
  WHATSAPP: "Meta Cloud API for WhatsApp Business",
  INSTAGRAM: "Instagram Direct Messages via Meta Graph API",
  FACEBOOK_MESSENGER: "Facebook Messenger via Page integration",
  EMAIL: "Send and receive emails via SMTP/IMAP",
};

export function ChannelForm({
  channel,
  onSubmit,
  onCancel,
  isSubmitting,
}: ChannelFormProps) {
  const isEdit = !!channel;
  const [selectedType, setSelectedType] = useState<ChannelType | null>(
    channel?.type ?? null,
  );
  const [name, setName] = useState(channel?.name ?? "");
  const [rateLimitPerMin, setRateLimitPerMin] = useState<string>(
    channel?.rateLimitPerMin?.toString() ?? "",
  );
  const [config, setConfig] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Type selection (create mode only)
  if (!isEdit && !selectedType) {
    return (
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 mb-4">
        <h3 className="text-lg font-semibold text-on-surface mb-1">
          Add Channel
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Select a channel type to get started
        </p>

        <div className="grid grid-cols-2 gap-3">
          {CHANNEL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className="flex items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <ChannelIcon type={type} className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {CHANNEL_TYPE_LABELS[type]}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {CHANNEL_DESCRIPTIONS[type]}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const configFields = selectedType ? CHANNEL_CONFIG_FIELDS[selectedType] : [];

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Channel name is required.";
    else if (name.trim().length > 100) e.name = "Name must be 100 characters or less.";
    if (rateLimitPerMin) {
      const r = parseInt(rateLimitPerMin);
      if (isNaN(r) || r < 1 || r > 1000) e.rateLimitPerMin = "Rate limit must be between 1 and 1000.";
    }
    if (!isEdit || showConfigPanel) {
      configFields.filter((f) => f.required).forEach((f) => {
        if (!config[f.key]?.trim()) e[f.key] = `${f.label} is required.`;
      });
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (isEdit) {
      const data: UpdateChannelRequest = {};
      if (name !== channel.name) data.name = name;
      if (rateLimitPerMin && parseInt(rateLimitPerMin) !== channel.rateLimitPerMin) {
        data.rateLimitPerMin = parseInt(rateLimitPerMin);
      }
      if (showConfigPanel && Object.keys(config).length > 0) {
        data.config = config;
      }
      onSubmit(data);
    } else {
      const data: CreateChannelRequest = {
        type: selectedType!,
        name,
        config,
        ...(rateLimitPerMin && { rateLimitPerMin: parseInt(rateLimitPerMin) }),
      };
      onSubmit(data);
    }
  };

  const isValid = () => {
    if (!name.trim()) return false;
    if (isEdit && !showConfigPanel) return true;
    return configFields
      .filter((f) => f.required)
      .every((f) => config[f.key]?.trim());
  };

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        {!isEdit && (
          <button
            onClick={() => setSelectedType(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          {selectedType && <ChannelIcon type={selectedType} className="h-5 w-5 text-primary" />}
          <h3 className="text-lg font-semibold text-on-surface">
            {isEdit ? `Edit ${channel.name}` : `New ${CHANNEL_TYPE_LABELS[selectedType!]} Channel`}
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Channel Name */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">
            Channel Name <span className="text-error">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            placeholder={`e.g. Main ${CHANNEL_TYPE_LABELS[selectedType!]}`}
          />
          {errors.name && <p className="text-[11px] text-error mt-1">{errors.name}</p>}
        </div>

        {/* Rate Limit */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">
            Rate Limit (msgs/min)
          </label>
          <Input
            type="number"
            value={rateLimitPerMin}
            onChange={(e) => { setRateLimitPerMin(e.target.value); setErrors((p) => ({ ...p, rateLimitPerMin: "" })); }}
            placeholder="60 (default)"
            min={1}
            max={1000}
          />
          {errors.rateLimitPerMin
            ? <p className="text-[11px] text-error mt-1">{errors.rateLimitPerMin}</p>
            : <p className="text-xs text-on-surface-variant mt-1">Leave empty for default (60/min)</p>
          }
        </div>

        {/* Config fields */}
        {isEdit ? (
          <div>
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showConfigPanel ? "Hide" : "Update"} Credentials
            </button>
            {showConfigPanel && (
              <div className="mt-3 space-y-3">
                {configFields.map((field) => (
                  <ConfigFieldInput
                    key={field.key}
                    field={field}
                    value={config[field.key] ?? ""}
                    onChange={(val) => { setConfig({ ...config, [field.key]: val }); setErrors((p) => ({ ...p, [field.key]: "" })); }}
                    showPassword={showPasswords[field.key] ?? false}
                    togglePassword={() =>
                      setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })
                    }
                    error={errors[field.key]}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-on-surface">
              Provider Configuration
            </p>
            {configFields.map((field) => (
              <ConfigFieldInput
                key={field.key}
                field={field}
                value={config[field.key] ?? ""}
                onChange={(val) => { setConfig({ ...config, [field.key]: val }); setErrors((p) => ({ ...p, [field.key]: "" })); }}
                showPassword={showPasswords[field.key] ?? false}
                togglePassword={() =>
                  setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })
                }
                error={errors[field.key]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid() || isSubmitting}
          loading={isSubmitting}
        >
          {isEdit ? "Save Changes" : "Create Channel"}
        </Button>
      </div>
    </div>
  );
}

// ─── Config field input sub-component ─────

function ConfigFieldInput({
  field,
  value,
  onChange,
  showPassword,
  togglePassword,
  error,
}: {
  field: { key: string; label: string; type: string; required: boolean; placeholder: string };
  value: string;
  onChange: (val: string) => void;
  showPassword: boolean;
  togglePassword: () => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-1">
        {field.label}
        {field.required && <span className="text-error"> *</span>}
      </label>
      <div className="relative">
        <Input
          type={field.type === "password" && !showPassword ? "password" : field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
        {field.type === "password" && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-error mt-1">{error}</p>}
    </div>
  );
}
