"use client";

import { useState } from "react";
import type {
  SlaPolicy,
  CreateSlaPolicyRequest,
  UpdateSlaPolicyRequest,
  SlaMetricType,
  SlaPriority,
} from "@/lib/types/sla";

const METRIC_OPTIONS: { value: SlaMetricType; label: string; description: string }[] = [
  { value: "FIRST_RESPONSE_TIME", label: "First Response", description: "Time until the first agent reply" },
  { value: "AVG_RESPONSE_TIME",   label: "Avg Response",   description: "Average reply time per message" },
  { value: "RESOLUTION_TIME",     label: "Resolution",     description: "Total time to close the conversation" },
];

const PRIORITY_OPTIONS: { value: SlaPriority; label: string; color: string }[] = [
  { value: "LOW",      label: "Low",      color: "text-on-surface-variant" },
  { value: "NORMAL",   label: "Normal",   color: "text-primary" },
  { value: "HIGH",     label: "High",     color: "text-warning" },
  { value: "CRITICAL", label: "Critical", color: "text-error" },
];

const PRESETS: { label: string; breach: number; warning: number }[] = [
  { label: "15 min",  breach: 15,   warning: 10   },
  { label: "30 min",  breach: 30,   warning: 20   },
  { label: "1 hour",  breach: 60,   warning: 45   },
  { label: "2 hours", breach: 120,  warning: 90   },
  { label: "4 hours", breach: 240,  warning: 180  },
  { label: "1 day",   breach: 1440, warning: 1080 },
];

function fmtMin(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

interface SlaPolicyFormProps {
  policy?: SlaPolicy;
  onSubmit: (data: CreateSlaPolicyRequest | UpdateSlaPolicyRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SlaPolicyForm({ policy, onSubmit, onCancel, isSubmitting }: SlaPolicyFormProps) {
  const isEdit = !!policy;

  const [name,          setName]          = useState(policy?.name ?? "");
  const [description,   setDescription]   = useState(policy?.description ?? "");
  const [metricType,    setMetricType]    = useState<SlaMetricType>(policy?.metricType ?? "FIRST_RESPONSE_TIME");
  const [priority,      setPriority]      = useState<SlaPriority>(policy?.priority ?? "NORMAL");
  const [thresholdMin,  setThresholdMin]  = useState(policy ? Math.round(policy.thresholdMs / 60_000) : 60);
  const [warningMin,    setWarningMin]    = useState(policy?.warningThresholdMs ? Math.round(policy.warningThresholdMs / 60_000) : 45);
  const [hasWarning,    setHasWarning]    = useState(policy ? policy.warningThresholdMs != null : true);
  const [businessHours, setBusinessHours] = useState(policy?.businessHoursOnly ?? false);
  const [businessStart, setBusinessStart] = useState(policy?.businessHoursStart ?? 9);
  const [businessEnd,   setBusinessEnd]   = useState(policy?.businessHoursEnd ?? 18);
  const [notifyBreach,  setNotifyBreach]  = useState(policy?.notifyOnBreach ?? true);
  const [notifyWarning, setNotifyWarning] = useState(policy?.notifyOnWarning ?? true);
  const [error,         setError]         = useState("");

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Policy name is required."); return; }
    if (thresholdMin < 1) { setError("Breach threshold must be at least 1 minute."); return; }
    if (hasWarning && warningMin >= thresholdMin) { setError("Warning must be less than breach threshold."); return; }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      metricType,
      priority,
      thresholdMs: thresholdMin * 60_000,
      warningThresholdMs: hasWarning ? warningMin * 60_000 : undefined,
      businessHoursOnly: businessHours,
      ...(businessHours ? { businessHoursStart: businessStart, businessHoursEnd: businessEnd, businessDays: [1,2,3,4,5] } : {}),
      notifyOnBreach: notifyBreach,
      notifyOnWarning: notifyWarning,
    });
  };

  const sectionLabel = "text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-widest";
  const inputCls = "w-full rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15 transition-colors";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-outline-variant/10">
        <h3 className="text-[14px] font-semibold text-on-surface">
          {isEdit ? "Edit SLA Policy" : "New SLA Policy"}
        </h3>
        <p className="text-[12px] text-on-surface-variant/50 mt-0.5">
          Define response time targets and breach rules for your team.
        </p>
      </div>

      <div className="divide-y divide-outline-variant/8">

        {/* ── Identity ── */}
        <div className="px-6 py-5 space-y-3">
          <p className={sectionLabel}>Details</p>
          <div>
            <label className="block text-[12px] text-on-surface-variant mb-1">
              Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Reply — 1 Hour"
              className={inputCls}
              autoFocus
              maxLength={255}
            />
          </div>
          <div>
            <label className="block text-[12px] text-on-surface-variant mb-1">
              Description <span className="text-on-surface-variant/40">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When does this policy apply?"
              className={inputCls}
              maxLength={500}
            />
          </div>
        </div>

        {/* ── Metric & Priority ── */}
        <div className="px-6 py-5 grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <p className={sectionLabel}>Metric</p>
            {METRIC_OPTIONS.map((m) => (
              <label key={m.value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="metric"
                  value={m.value}
                  checked={metricType === m.value}
                  onChange={() => setMetricType(m.value)}
                  className="mt-0.5 accent-primary shrink-0"
                />
                <div>
                  <p className="text-[13px] text-on-surface leading-tight">{m.label}</p>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{m.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <p className={sectionLabel}>Priority</p>
            {PRIORITY_OPTIONS.map((p) => (
              <label key={p.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={priority === p.value}
                  onChange={() => setPriority(p.value)}
                  className="accent-primary shrink-0"
                />
                <span className={`text-[13px] ${priority === p.value ? p.color : "text-on-surface-variant"}`}>
                  {p.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Thresholds ── */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={sectionLabel}>Thresholds</p>
            {/* Presets */}
            <div className="flex items-center gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setThresholdMin(p.breach); setWarningMin(p.warning); setHasWarning(true); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                    thresholdMin === p.breach
                      ? "border-primary/50 bg-primary/8 text-primary font-semibold"
                      : "border-outline-variant/15 text-on-surface-variant/60 hover:border-outline-variant/40 hover:text-on-surface-variant"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breach + Warning inputs side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Breach */}
            <div className="rounded-lg border border-outline-variant/15 bg-surface-container p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-on-surface">Breach threshold</p>
                <span className="text-[13px] font-bold text-error">{fmtMin(thresholdMin)}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/50">Max time before SLA is marked as breached</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={thresholdMin}
                  onChange={(e) => setThresholdMin(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
                />
                <span className="text-[12px] text-on-surface-variant/60">minutes</span>
              </div>
            </div>

            {/* Warning */}
            <div className={`rounded-lg border p-4 space-y-3 transition-opacity ${hasWarning ? "border-outline-variant/15 bg-surface-container" : "border-outline-variant/10 bg-surface-container/40 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-on-surface">Warning alert</p>
                <div className="flex items-center gap-2">
                  {hasWarning && <span className="text-[13px] font-bold text-warning">{fmtMin(warningMin)}</span>}
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setHasWarning(!hasWarning)}
                    className={`relative w-7 h-3.5 rounded-full transition-colors shrink-0 ${hasWarning ? "bg-primary" : "bg-outline-variant/30"}`}
                  >
                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${hasWarning ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant/50">Notify agent before breach deadline</p>
              {hasWarning && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={thresholdMin - 1}
                    value={warningMin}
                    onChange={(e) => setWarningMin(Math.max(1, Math.min(thresholdMin - 1, Number(e.target.value))))}
                    className="w-20 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
                  />
                  <span className="text-[12px] text-on-surface-variant/60">minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline strip */}
          {hasWarning && thresholdMin > 0 && (
            <div className="space-y-1.5">
              <div className="h-1 rounded-full overflow-hidden bg-outline-variant/15 flex">
                <div className="bg-success/40 h-full" style={{ width: `${Math.round((warningMin / thresholdMin) * 100)}%` }} />
                <div className="bg-warning/40 h-full flex-1" />
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant/40">
                <span>0</span>
                <span>{fmtMin(warningMin)} — warning</span>
                <span>{fmtMin(thresholdMin)} — breach</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Options ── */}
        <div className="px-6 py-5 space-y-3">
          <p className={sectionLabel}>Options</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={businessHours}
                onChange={(e) => setBusinessHours(e.target.checked)}
                className="rounded accent-primary mt-0.5 shrink-0"
              />
              <div>
                <p className="text-[13px] text-on-surface">Business hours only</p>
                <p className="text-[11px] text-on-surface-variant/50">Pause timer outside work hours (Mon–Fri)</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBreach}
                onChange={(e) => setNotifyBreach(e.target.checked)}
                className="rounded accent-primary mt-0.5 shrink-0"
              />
              <div>
                <p className="text-[13px] text-on-surface">Notify on breach</p>
                <p className="text-[11px] text-on-surface-variant/50">Alert agent when SLA is exceeded</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWarning}
                onChange={(e) => setNotifyWarning(e.target.checked)}
                className="rounded accent-primary mt-0.5 shrink-0"
              />
              <div>
                <p className="text-[13px] text-on-surface">Notify on warning</p>
                <p className="text-[11px] text-on-surface-variant/50">Alert agent before breach deadline</p>
              </div>
            </label>
          </div>

          {/* Business hours time pickers */}
          {businessHours && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] text-on-surface-variant/60 mb-1.5">Start hour</label>
                <select
                  value={businessStart}
                  onChange={(e) => setBusinessStart(Number(e.target.value))}
                  className={inputCls}
                >
                  {Array.from({ length: 13 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant/60 mb-1.5">End hour</label>
                <select
                  value={businessEnd}
                  onChange={(e) => setBusinessEnd(Number(e.target.value))}
                  className={inputCls}
                >
                  {Array.from({ length: 13 }, (_, i) => i + 12).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center gap-3">
        {error
          ? <p className="flex-1 text-[12px] text-error">{error}</p>
          : <span className="flex-1" />
        }
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <span className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
          )}
          {isEdit ? "Save Changes" : "Create Policy"}
        </button>
      </div>
    </form>
  );
}
