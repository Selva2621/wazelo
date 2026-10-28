"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Plus, Sparkles, X } from "lucide-react";
import { Drawer } from "@/components/ui/modal";
import { IconButton } from "@/components/ui/icon-button";
import { toast } from "sonner";
import {
  useSAAiModels,
  useSAAiPack,
  useSAAiSettings,
  useSAAiUsage,
  useSACreateAiPack,
  useSATestAi,
  useSAUpdateAiPack,
  useSAUpdateAiSettings,
} from "@/hooks/use-super-admin-ai";
import type { SAAiCreditPack, SAAiSettings } from "@/lib/api/super-admin-ai";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

const sectionClass = "bg-surface-container-lowest border border-outline-variant rounded-2xl p-5";
const selectClass =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-body-lg text-on-surface outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30";
const n = (value: number) => value.toLocaleString("en-IN");

/** One credit's price — often a fraction of a cent/paisa, so shown to 2 significant digits ($0.0038). */
function perCreditPrice(priceInCents: number, credits: number, currency: string): string {
  const major = priceInCents / 100 / credits;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      ...(major >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 2 }),
    }).format(major);
  } catch {
    return `${major.toPrecision(2)} ${currency}`;
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: "OpenRouter (300+ models)",
  openai: "OpenAI",
  groq: "Groq",
  xai: "xAI (Grok)",
  mistral: "Mistral",
  together: "Together",
  cerebras: "Cerebras",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  cohere: "Cohere",
  huggingface: "Hugging Face",
};

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
}

/** Title + one-line description, with an optional action on the right. Shared by every card. */
function CardHeader({ id, title, description, action }: { id: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="text-body-lg font-medium text-on-surface">
          {title}
        </h2>
        <p className="text-label text-on-surface-variant">{description}</p>
      </div>
      {action}
    </div>
  );
}

const MAX_SHOWN_MODELS = 100;

/**
 * Searchable model list. Opening it shows every model (the current value doesn't
 * filter until you type); any id can still be typed and used.
 */
function ModelPicker({
  id,
  value,
  onChange,
  models,
  loading,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  models: string[];
  loading: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;

  const q = (query ?? "").trim().toLowerCase();
  const filtered = q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
  const shown = filtered.slice(0, MAX_SHOWN_MODELS);

  const close = () => {
    setOpen(false);
    setQuery(null);
  };

  // Click outside closes the list
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const pick = (m: string) => {
    onChange(m);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
          value={query ?? value}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="pr-9 font-mono text-body"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close model list" : "Show models"}
          onClick={() => (open ? close() : setOpen(true))}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-on-surface-variant hover:text-on-surface"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface py-1 shadow-lg"
        >
          {loading && models.length === 0 ? (
            <li className="px-3 py-2 text-body text-on-surface-variant">Loading models…</li>
          ) : shown.length === 0 ? (
            <li className="px-3 py-2 text-body text-on-surface-variant">
              {models.length === 0 ? "No model list for this provider. Type the model id." : "No match. The typed id will be used."}
            </li>
          ) : (
            shown.map((m, i) => (
              <li
                key={m}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={m === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 font-mono text-body text-on-surface",
                  i === active && "bg-surface-container-high",
                )}
              >
                <span className="truncate">{m}</span>
                {m === value && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
              </li>
            ))
          )}
          {filtered.length > shown.length && (
            <li className="border-t border-outline-variant px-3 py-1.5 text-label text-on-surface-variant">
              {n(filtered.length - shown.length)} more — type to narrow down
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const footerClass =
  "flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-3";

/** Provider, key, model. Re-mounted (keyed) when the saved values change. */
function ProviderCard({ settings }: { settings: SAAiSettings }) {
  const update = useSAUpdateAiSettings();
  const test = useSATestAi();
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState("");
  const models = useSAAiModels(provider, apiKey.trim());

  // Model ids differ per provider: switching clears it (back to the saved one when switching back)
  const changeProvider = (next: string) => {
    setProvider(next);
    setModel(next === settings.provider ? settings.model : "");
    test.reset();
  };

  const dirty = provider !== settings.provider || model.trim() !== settings.model || apiKey.trim() !== "";
  // A different provider needs its own key
  const needsKey = provider !== settings.provider && !apiKey.trim();

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { provider, model: model.trim(), apiKey: apiKey.trim() },
      {
        onSuccess: () => toast.success("AI provider saved"),
        onError: (err) => toast.error(errorMessage(err, "Could not save")),
      },
    );
  };

  const runTest = () =>
    test.mutate(
      { provider, model: model.trim(), ...(apiKey.trim() && { apiKey: apiKey.trim() }) },
      { onError: (err) => toast.error(errorMessage(err, "Test failed")) },
    );

  const keySource =
    settings.source.apiKey === "settings"
      ? { label: "Encrypted", variant: "success" as const }
      : settings.source.apiKey === "env"
        ? { label: "From .env", variant: "warning" as const }
        : { label: "Missing", variant: "error" as const };

  return (
    <section aria-labelledby="provider-heading" className={cn(sectionClass, "p-0 overflow-hidden")}>
      <CardHeader
        id="provider-heading"
        title="Provider"
        description="Every AI feature on the platform uses this model."
        action={settings.apiKeySet ? <Badge dot variant="success">Connected</Badge> : <Badge dot variant="warning">No key</Badge>}
      />

      <form onSubmit={save} noValidate>
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="ai-provider">Provider</Label>
            <select id="ai-provider" value={provider} onChange={(e) => changeProvider(e.target.value)} className={selectClass}>
              {settings.providers.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p] ?? p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ai-model">Model</Label>
              <span
                className={cn("text-label", models.data?.error ? "text-warning" : "text-on-surface-variant")}
                aria-live="polite"
              >
                {models.isFetching
                  ? "Loading…"
                  : models.data?.models.length
                    ? `${n(models.data.models.length)} available`
                    : models.data?.error ?? null}
              </span>
            </div>
            <ModelPicker
              id="ai-model"
              value={model}
              onChange={setModel}
              models={models.data?.models ?? []}
              loading={models.isFetching}
              placeholder={provider === "openrouter" ? "openai/gpt-4o-mini" : "Pick or type a model id"}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ai-key">API key</Label>
              <Badge dot variant={keySource.variant}>{keySource.label}</Badge>
            </div>
            <Input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings.apiKeySet ? "••••••••••••  saved — paste to replace" : "Paste the provider's API key"}
              autoComplete="new-password"
              spellCheck={false}
            />
            {needsKey && (
              <p className="text-label text-warning">Paste the {PROVIDER_LABELS[provider] ?? provider} key to switch provider.</p>
            )}
          </div>
        </div>

        <div className={footerClass}>
          <p className="min-w-0 text-body" aria-live="polite">
            {test.data ? (
              test.data.ok ? (
                <span className="text-success">Works · {n(test.data.latencyMs ?? 0)} ms</span>
              ) : (
                <span className="text-error">{test.data.error ?? "The provider rejected the request"}</span>
              )
            ) : (
              <span className="text-on-surface-variant">Test before saving to catch a wrong key or model.</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={runTest} loading={test.isPending} disabled={!model.trim() || needsKey}>
              Test
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!dirty || !model.trim() || needsKey}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

const MAX_COST = 100;

const COST_GROUPS: { title: string; actions: string[] }[] = [
  {
    title: "Inbox",
    actions: ["smart_reply", "summarize", "sentiment", "categorize", "intent", "routing", "kb_search", "full_analysis"],
  },
  { title: "Automation", actions: ["chatbot_reply", "widget_reply", "purchase_intent", "automation_rule", "org_memory"] },
  {
    title: "Sales & content",
    actions: ["deal_score", "deal_scope", "proposal_draft", "proposal_improve", "campaign_copy", "template_generate", "insights"],
  },
  { title: "Knowledge", actions: ["kb_build", "faq_generate", "kb_tags"] },
];

const stepButton =
  "flex h-8 w-8 items-center justify-center text-on-surface-variant outline-none transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent";

function CostStepper({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(MAX_COST, Math.max(0, Math.round(v)));
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-lg border border-outline-variant bg-surface focus-within:border-primary">
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 0}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(clamp(digits === "" ? 0 : Number(digits)));
        }}
        onFocus={(e) => e.target.select()}
        className="h-full w-10 border-x border-outline-variant bg-transparent text-center text-body tabular-nums text-on-surface outline-none"
      />
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= MAX_COST}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function CostsCard({ settings }: { settings: SAAiSettings }) {
  const update = useSAUpdateAiSettings();
  const saved = Object.fromEntries(settings.actions.map((a) => [a.action, a.cost]));
  const [costs, setCosts] = useState<Record<string, number>>(saved);

  const byAction = new Map(settings.actions.map((a) => [a.action, a]));
  const grouped = new Set(COST_GROUPS.flatMap((g) => g.actions));
  const groups = [
    ...COST_GROUPS.map((g) => ({ ...g, actions: g.actions.filter((a) => byAction.has(a)) })),
    { title: "Other", actions: settings.actions.map((a) => a.action).filter((a) => !grouped.has(a)) },
  ].filter((g) => g.actions.length > 0);

  const changed = settings.actions.filter((a) => costs[a.action] !== a.cost).length;

  const save = () =>
    update.mutate(
      { actionCosts: costs },
      {
        onSuccess: () => toast.success("Credit costs saved"),
        onError: (err) => toast.error(errorMessage(err, "Could not save")),
      },
    );

  return (
    <section aria-labelledby="costs-heading" className={cn(sectionClass, "p-0 overflow-hidden")}>
      <CardHeader
        id="costs-heading"
        title="Credits per action"
        description="Charged each time the action runs. 0 makes it free."
      />

      <div className="grid gap-x-8 px-5 pb-2 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="pb-3">
            <h3 className="border-b border-outline-variant pb-1.5 pt-2 text-label font-medium text-on-surface-variant">
              {group.title}
            </h3>
            <ul>
              {group.actions.map((key) => {
                const a = byAction.get(key)!;
                const value = costs[key];
                const isChanged = value !== a.cost;
                return (
                  <li
                    key={key}
                    className="flex min-h-11 items-center justify-between gap-3 border-b border-outline-variant/60 py-1.5 last:border-0"
                  >
                    <label htmlFor={`cost-${key}`} className="min-w-0 flex-1">
                      <span className="block truncate text-body text-on-surface">{a.label}</span>
                      {value === 0 ? (
                        <span className="text-label text-success">Free</span>
                      ) : value !== a.defaultCost ? (
                        <span className="text-label text-on-surface-variant">Default {a.defaultCost}</span>
                      ) : null}
                    </label>
                    <div className="flex items-center gap-2">
                      {isChanged && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unsaved" />}
                      <CostStepper
                        id={`cost-${key}`}
                        label={a.label}
                        value={value}
                        onChange={(v) => setCosts((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {changed > 0 && (
        <div className={footerClass}>
          <span className="text-body text-on-surface-variant">
            {changed} unsaved {changed === 1 ? "change" : "changes"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCosts(saved)} disabled={update.isPending}>
              Reset
            </Button>
            <Button onClick={save} loading={update.isPending}>
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Sell / stop and view buttons for one pack row (own mutation, so only that row shows a spinner). */
function PackActions({ pack, onView }: { pack: SAAiCreditPack; onView: () => void }) {
  const update = useSAUpdateAiPack();
  const toggle = () =>
    update.mutate(
      { id: pack.id, isActive: !pack.isActive },
      {
        onSuccess: () => toast.success(pack.isActive ? "Pack taken off sale" : "Pack on sale"),
        onError: (err) => toast.error(errorMessage(err, "Could not update the pack")),
      },
    );
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={toggle}
        loading={update.isPending}
        aria-label={`${pack.isActive ? "Stop selling" : "Sell"} ${pack.name}`}
      >
        {pack.isActive ? "Stop" : "Sell"}
      </Button>
      <Button size="sm" variant="secondary" onClick={onView} aria-label={`View ${pack.name} ${pack.currency} pack`}>
        View
      </Button>
    </div>
  );
}

const packColumns = (onView: (id: string) => void): DataTableColumn<SAAiCreditPack>[] => [
  {
    id: "pack",
    header: "Pack",
    skeleton: "avatar",
    cell: (pack) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-on-surface">
            <span className="tabular-nums">{n(pack.credits)}</span> credits
            <span className="font-normal text-on-surface-variant"> · {pack.name}</span>
          </p>
          <p className="text-label tabular-nums text-on-surface-variant">
            {perCreditPrice(pack.priceInCents, pack.credits, pack.currency)} per credit
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "price",
    header: "Price",
    align: "right",
    skeleton: "short",
    cellClassName: "text-body-lg font-semibold tabular-nums text-on-surface",
    cell: (pack) => formatMoney(pack.priceInCents, pack.currency),
  },
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cell: (pack) =>
      pack.isActive ? <Badge dot variant="success">On sale</Badge> : <Badge dot variant="muted">Off sale</Badge>,
  },
  {
    id: "actions",
    header: "Actions",
    hideHeader: true,
    align: "right",
    skeleton: "none",
    cell: (pack) => <PackActions pack={pack} onView={() => onView(pack.id)} />,
  },
];

function SalesTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl py-1">
      <p className="text-label text-on-surface-variant">{label}</p>
      <p className="text-body-lg font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  );
}

/** One pack: how it sold, its latest buyers, and editing it. */
function PackDetail({ packId, titleId, onClose }: { packId: string; titleId: string; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useSAAiPack(packId);
  const update = useSAUpdateAiPack();
  const [form, setForm] = useState<{ name: string; credits: string; price: string; sortOrder: string } | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Spinner />
        <span className="sr-only">Loading pack…</span>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="p-5">
        <Alert variant="error">
          Could not load the pack.{" "}
          <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
            Try again
          </button>
        </Alert>
      </div>
    );
  }

  const { pack, sales } = data;
  const values = form ?? {
    name: pack.name,
    credits: String(pack.credits),
    price: String(pack.priceInCents / 100),
    sortOrder: String(pack.sortOrder),
  };
  const credits = Number(values.credits);
  const priceInCents = Math.round(Number(values.price) * 100);
  const sortOrder = Number(values.sortOrder);
  const valid =
    values.name.trim() !== "" &&
    Number.isInteger(credits) && credits > 0 &&
    Number.isFinite(priceInCents) && priceInCents >= 100 &&
    Number.isInteger(sortOrder) && sortOrder >= 0;
  const dirty =
    values.name.trim() !== pack.name || credits !== pack.credits || priceInCents !== pack.priceInCents || sortOrder !== pack.sortOrder;
  const set = (patch: Partial<typeof values>) => setForm({ ...values, ...patch });

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || !dirty) return;
    update.mutate(
      { id: pack.id, name: values.name.trim(), credits, priceInCents, sortOrder },
      {
        onSuccess: () => {
          toast.success("Pack updated");
          setForm(null);
        },
        onError: (err) => toast.error(errorMessage(err, "Could not update the pack")),
      },
    );
  };

  const toggle = () =>
    update.mutate(
      { id: pack.id, isActive: !pack.isActive },
      {
        onSuccess: () => toast.success(pack.isActive ? "Pack taken off sale" : "Pack on sale"),
        onError: (err) => toast.error(errorMessage(err, "Could not update the pack")),
      },
    );

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-title-sm font-semibold text-on-surface">
            {pack.name} · {pack.currency}
          </h2>
          <p className="text-label text-on-surface-variant">
            {n(pack.credits)} credits for {formatMoney(pack.priceInCents, pack.currency)}
          </p>
        </div>
        <IconButton aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section aria-labelledby="pack-sales-heading" className="space-y-3">
          <h3 id="pack-sales-heading" className="text-label font-medium text-on-surface-variant">
            Sales
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <SalesTile label="Purchases" value={n(sales.purchases)} />
            <SalesTile label="Workspaces" value={n(sales.buyers)} />
            <SalesTile label="Credits sold" value={n(sales.creditsSold)} />
            <SalesTile label="Revenue" value={formatMoney(sales.revenueInCents, pack.currency)} />
          </div>
        </section>

        <section aria-labelledby="pack-buyers-heading" className="space-y-2">
          <h3 id="pack-buyers-heading" className="text-label font-medium text-on-surface-variant">
            Latest purchases
          </h3>
          {sales.recent.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant px-4 py-5 text-center text-body text-on-surface-variant">
              Not bought yet
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {sales.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Link
                    href={`/super-admin/organizations/${r.orgId}`}
                    className="truncate text-body text-on-surface hover:text-primary hover:underline"
                  >
                    {r.orgName}
                  </Link>
                  <span className="shrink-0 text-label tabular-nums text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form id="pack-edit-form" onSubmit={save} noValidate className="space-y-3" aria-labelledby="pack-edit-heading">
          <h3 id="pack-edit-heading" className="text-label font-medium text-on-surface-variant">
            Details
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="edit-pack-name">Name</Label>
            <Input id="edit-pack-name" value={values.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-pack-credits">Credits</Label>
              <Input
                id="edit-pack-credits"
                type="number"
                min={1}
                inputMode="numeric"
                value={values.credits}
                onChange={(e) => set({ credits: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pack-price">Price ({pack.currency})</Label>
              <Input
                id="edit-pack-price"
                type="number"
                min={1}
                step="0.01"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => set({ price: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-pack-order">Display order</Label>
            <Input
              id="edit-pack-order"
              type="number"
              min={0}
              inputMode="numeric"
              value={values.sortOrder}
              onChange={(e) => set({ sortOrder: e.target.value })}
              className="w-24"
            />
          </div>
          <p className="text-label text-on-surface-variant">
            {valid
              ? `${perCreditPrice(priceInCents, credits, pack.currency)} per credit. Changes apply to new purchases only.`
              : "Name, whole credits and a price of at least 1 are required."}
          </p>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-3">
        <Button type="button" variant="ghost" onClick={toggle} disabled={update.isPending}>
          {pack.isActive ? "Stop selling" : "Put on sale"}
        </Button>
        <div className="flex gap-2">
          {dirty && (
            <Button type="button" variant="ghost" onClick={() => setForm(null)} disabled={update.isPending}>
              Reset
            </Button>
          )}
          <Button type="submit" form="pack-edit-form" loading={update.isPending} disabled={!dirty || !valid}>
            Save
          </Button>
        </div>
      </div>
    </>
  );
}

function PacksCard({ packs }: { packs: SAAiCreditPack[] }) {
  const create = useSACreateAiPack();
  const [viewing, setViewing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", credits: "", price: "", currency: "INR" });

  const credits = Number(form.credits);
  const priceInCents = Math.round(Number(form.price) * 100);
  const valid = form.name.trim() && Number.isInteger(credits) && credits > 0 && priceInCents >= 100;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    create.mutate(
      { name: form.name.trim(), credits, priceInCents, currency: form.currency },
      {
        onSuccess: () => {
          toast.success("Pack added");
          setForm({ name: "", credits: "", price: "", currency: form.currency });
          setOpen(false);
        },
        onError: (err) => toast.error(errorMessage(err, "Could not add the pack")),
      },
    );
  };

  const onSale = packs.filter((p) => p.isActive).length;

  return (
    <section aria-labelledby="packs-heading" className={cn(sectionClass, "p-0 overflow-hidden")}>
      <CardHeader
        id="packs-heading"
        title="Credit packs"
        description={
          packs.length
            ? `${onSale} on sale. Bought credits never expire and are used after plan credits.`
            : "What workspaces can buy once their plan credits run out."
        }
        action={
          !open && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add pack
            </Button>
          )
        }
      />

      {open && (
        <form onSubmit={submit} noValidate className="border-y border-outline-variant bg-surface-container/60">
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_6rem]">
            <div className="space-y-1.5">
              <Label htmlFor="pack-name">Name</Label>
              <Input id="pack-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Starter" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pack-credits">Credits</Label>
              <Input id="pack-credits" type="number" min={1} inputMode="numeric" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="1000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pack-price">Price</Label>
              <Input id="pack-price" type="number" min={1} step="0.01" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="499" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pack-currency">Currency</Label>
              <select id="pack-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={selectClass}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
            <span className="text-label tabular-nums text-on-surface-variant">
              {valid ? `${perCreditPrice(priceInCents, credits, form.currency)} per credit` : "Name, credits and a price of at least 1"}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending} disabled={!valid}>
                Add pack
              </Button>
            </div>
          </div>
        </form>
      )}

      {packs.length === 0 ? (
        !open && (
          <div className="mx-5 mb-5 px-5 py-8 text-center">
            <p className="text-body text-on-surface">No packs yet</p>
            <p className="text-label text-on-surface-variant">Workspaces can&apos;t buy extra credits until you add one.</p>
          </div>
        )
      ) : (
        <DataTable
          label="Credit packs"
          columns={packColumns(setViewing)}
          rows={packs}
          rowKey={(p) => p.id}
          rowLabel={(p) => p.name}
          rowClassName={(p) => (!p.isActive ? "opacity-60" : undefined)}
          wrapperClassName="border-t border-outline-variant"
        />
      )}

      <Drawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        aria-labelledby="pack-detail-title"
        className="max-w-md"
      >
        {() => viewing && <PackDetail key={viewing} packId={viewing} titleId="pack-detail-title" onClose={() => setViewing(null)} />}
      </Drawer>
    </section>
  );
}

function StatTile({ label, calls, credits }: { label: string; calls: number; credits: number }) {
  return (
    <div className="rounded-xl py-1">
      <p className="text-label text-on-surface-variant">{label}</p>
      <p className="mt-1 text-title font-semibold tabular-nums text-on-surface">{n(credits)}</p>
      <p className="text-label tabular-nums text-on-surface-variant">
        credits · {n(calls)} {calls === 1 ? "call" : "calls"}
      </p>
    </div>
  );
}

/** Label + value, with a bar sized against the largest row. */
function BarList({ title, rows }: { title: string; rows: { key: string; label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      <h3 className="text-label font-medium text-on-surface-variant">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex justify-between gap-2 text-body">
              <span className="truncate text-on-surface">{r.label}</span>
              <span className="tabular-nums text-on-surface-variant">{n(r.value)}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-surface-container-high" aria-hidden>
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsagePanel({ labels }: { labels: Map<string, string> }) {
  const { data, isLoading } = useSAAiUsage();
  const month = data?.last30Days;

  return (
    <aside aria-labelledby="usage-heading" className={cn(sectionClass, "p-0 overflow-hidden lg:sticky lg:top-6")}>
      <CardHeader id="usage-heading" title="Usage" description="Across all workspaces. Refreshes every minute." />
      {isLoading || !data || !month ? (
        <div className="flex justify-center py-8" role="status">
          <Spinner />
          <span className="sr-only">Loading usage…</span>
        </div>
      ) : (
        <div className="space-y-5 px-5 pb-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
            <StatTile label="Today" calls={data.today.calls} credits={data.today.credits} />
            <StatTile label="30 days" calls={month.calls} credits={month.credits} />
          </div>

          {month.calls === 0 ? (
            <div className="px-4 py-6 text-center">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-on-surface-variant" aria-hidden />
              <p className="text-body text-on-surface">No AI usage yet</p>
              <p className="text-label text-on-surface-variant">Top workspaces and actions show up here.</p>
            </div>
          ) : (
            <>
              {month.topOrgs.length > 0 && (
                <BarList
                  title="Top workspaces · 30 days"
                  rows={month.topOrgs.map((o) => ({ key: o.orgId, label: o.orgName, value: o.credits }))}
                />
              )}
              <BarList
                title="By action · 30 days"
                rows={month.byAction
                  .slice(0, 6)
                  .map((a) => ({ key: a.action, label: labels.get(a.action) ?? a.action, value: a.credits }))}
              />
            </>
          )}
        </div>
      )}
    </aside>
  );
}

export default function SuperAdminAiPage() {
  const { data: settings, isLoading, isError, refetch } = useSAAiSettings();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Spinner />
        <span className="sr-only">Loading AI settings…</span>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="p-6 max-w-2xl">
        <Alert variant="error">
          Could not load AI settings.{" "}
          <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
            Try again
          </button>
        </Alert>
      </div>
    );
  }

  const labels = new Map(settings.actions.map((a) => [a.action, a.label]));

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl">
      <PageHeader
        title="AI"
        description="One model for the platform"
        actions={
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", settings.apiKeySet ? "bg-success" : "bg-warning")}
              aria-hidden
            />
            <span className="text-on-surface">{PROVIDER_LABELS[settings.provider]?.replace(/ \(.*\)$/, "") ?? settings.provider}</span>
            <span className="truncate font-mono text-on-surface-variant">{settings.model}</span>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-5 min-w-0">
          <ProviderCard
            key={`${settings.provider}|${settings.model}|${settings.apiKeySet}|${settings.source.apiKey}`}
            settings={settings}
          />
          <CostsCard key={settings.actions.map((a) => a.cost).join(",")} settings={settings} />
          <PacksCard packs={settings.packs} />
        </div>
        <UsagePanel labels={labels} />
      </div>
    </div>
  );
}
