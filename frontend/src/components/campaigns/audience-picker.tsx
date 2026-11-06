"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTACT_SOURCES, CONTACT_SOURCE_LABELS } from "@/lib/constants/contact-sources";
import type { CreateCampaignFormData } from "@/lib/validations/campaigns";
import type { SavedContactGroup } from "@/lib/types/contacts";

export type AudienceFilters = NonNullable<CreateCampaignFormData["audienceFilters"]>;
type AudienceType = "ALL" | "FILTERED";
type Mode = "everyone" | "groups" | "custom";

const MODES: { value: Mode; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "groups", label: "Groups" },
  { value: "custom", label: "Custom" },
];

const LEAD_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"] as const;
const DATE_ADDED = [
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
] as const;
const RATINGS = [3, 3.5, 4, 4.5];

/** Lists longer than this get a search box */
const SEARCH_FROM = 8;

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

/** "Group 2" before "Group 10" */
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

/** Any filter besides saved groups is set */
function hasCustomFilters(f: AudienceFilters | undefined): boolean {
  if (!f) return false;
  return (
    !!f.contactIds?.length ||
    !!f.leadStatuses?.length ||
    !!f.sources?.length ||
    !!f.tagIds?.length ||
    !!f.ownerIds?.length ||
    !!f.productIds?.length ||
    !!f.scrapeRunId ||
    f.hasPhone !== undefined ||
    f.hasWebsite !== undefined ||
    f.minRating !== undefined ||
    !!f.dateAdded
  );
}

function inferMode(type: AudienceType, f: AudienceFilters | undefined): Mode {
  if (type === "ALL") return "everyone";
  return !hasCustomFilters(f) && f?.contactGroupIds?.length ? "groups" : "custom";
}

// ─── Dropdown filter button with a small checklist popover ───────────────────

interface FilterMenuProps {
  label: string;
  /** Number of values set; shown on the button ("Status · 2") */
  count: number;
  children: ReactNode;
}

interface PanelPos {
  left: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const PANEL_WIDTH = 256;

/**
 * A filter pill that opens a checklist: a popover under the button on desktop,
 * a bottom sheet on phones. Escape closes it and returns focus to the button.
 */
function FilterMenu({ label, count, children }: FilterMenuProps) {
  const panelId = `filter-menu-${useId().replace(/:/g, "")}`;
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const gap = 6;
    const margin = 12;
    const roomBelow = window.innerHeight - t.bottom - gap - margin;
    const roomAbove = t.top - gap - margin;
    const want = Math.min(panelRef.current?.scrollHeight ?? 320, 360);
    const above = roomBelow < want && roomAbove > roomBelow;
    const maxHeight = Math.max(160, Math.min(360, above ? roomAbove : roomBelow));
    const left = Math.min(Math.max(margin, t.left), window.innerWidth - PANEL_WIDTH - margin);
    setPos(above
      ? { left, maxHeight, bottom: window.innerHeight - t.top + gap }
      : { left, maxHeight, top: t.bottom + gap });
  }, []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Capture first so only this menu closes, not the dialog around it
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close(true);
    };
    window.addEventListener("keydown", onKey, true);
    if (isMobile) return () => window.removeEventListener("keydown", onKey, true);

    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close(false);
    };
    const onMove = () => place();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const frame = requestAnimationFrame(() => {
      place();
      panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, isMobile, place, close]);

  // The desktop panel lives in a portal; tabbing past either end goes back to the button
  const onPanelKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>("input:not([disabled]), button:not([disabled]), a[href]"),
    );
    const first = items[0];
    const last = items[items.length - 1];
    if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
      e.preventDefault();
      close(true);
    }
  };

  const active = count > 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) {
            close(false);
            return;
          }
          if (!isMobile) place();
          setOpen(true);
        }}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-label font-medium outline-none transition-colors duration-120 ease-standard focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11",
          active
            ? "border-transparent bg-on-surface text-surface"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
        )}
      >
        <span>{label}</span>
        {active && (
          <span className="tabular-nums">
            <span aria-hidden="true">· </span>{count}<span className="sr-only"> selected</span>
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-180 ease-standard", open && "rotate-180")}
        />
      </button>

      {isMobile ? (
        <BottomSheet
          open={open}
          onClose={() => close(false)}
          title={label}
          maxHeight={0.7}
          headerAction={
            <Button type="button" variant="ghost" size="sm" onClick={() => close(true)}>
              Done
            </Button>
          }
        >
          <div id={panelId} className="px-2 pb-4">{children}</div>
        </BottomSheet>
      ) : (
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            onKeyDown={onPanelKeys}
            style={{
              position: "fixed",
              left: pos?.left ?? -9999,
              top: pos ? pos.top : -9999,
              bottom: pos?.bottom,
              width: PANEL_WIDTH,
              maxHeight: pos?.maxHeight,
            }}
            // Above dialogs (z-50/60) and sheets (z-70), like the app's Select menu
            className="z-[80] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-1.5 shadow-popover"
          >
            {children}
          </div>,
          document.body,
        )
      )}
    </>
  );
}

// ─── Checklist rows used inside the menus ────────────────────────────────────

interface Option {
  value: string;
  label: string;
}

const ROW = "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-body text-on-surface hover:bg-surface-container max-lg:min-h-11";
const CHECK = "h-4 w-4 shrink-0 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Multi-select checklist; searchable when long */
function Checklist({
  legend, options, selected, onToggle, empty = "Nothing to pick yet",
}: {
  legend: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  empty?: string;
}) {
  const baseId = useId().replace(/:/g, "");
  const [query, setQuery] = useState("");
  const searchable = options.length > SEARCH_FROM;
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      {searchable && (
        <div className="p-1 pb-1.5">
          <Label htmlFor={`${baseId}-search`} className="sr-only">Search {legend.toLowerCase()}</Label>
          <Input
            id={`${baseId}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            leadingIcon={<Search />}
            className="h-9"
          />
        </div>
      )}
      {options.length === 0 ? (
        <p className="px-2.5 py-3 text-label text-on-surface-variant">{empty}</p>
      ) : visible.length === 0 ? (
        <p className="px-2.5 py-3 text-label text-on-surface-variant">No matches</p>
      ) : (
        visible.map((option) => {
          const id = `${baseId}-${option.value}`;
          return (
            <label key={option.value} htmlFor={id} className={ROW}>
              <input
                id={id}
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className={CHECK}
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </label>
          );
        })
      )}
    </fieldset>
  );
}

/** Single choice; the first option means "any" */
function RadioList({
  legend, name, options, value, onChange,
}: {
  legend: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const baseId = useId().replace(/:/g, "");
  return (
    <fieldset className="py-0.5">
      <legend className="px-2.5 pt-1.5 pb-0.5 text-caption font-medium text-on-surface-variant">{legend}</legend>
      {options.map((option) => {
        const id = `${baseId}-${option.value || "any"}`;
        return (
          <label key={option.value} htmlFor={id} className={ROW}>
            <input
              id={id}
              type="radio"
              name={`${baseId}-${name}`}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className={CHECK}
            />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-0.5 text-caption font-medium text-primary">
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-none hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X aria-hidden className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Audience picker ─────────────────────────────────────────────────────────

export interface AudiencePickerProps {
  audienceType: AudienceType;
  filters: AudienceFilters | undefined;
  onChange: (type: AudienceType, filters: AudienceFilters | undefined) => void;
  /** Recipients per batch, for the group summary */
  batchSize: number;
  /** Email campaigns don't skip numbers that aren't on WhatsApp */
  isEmail?: boolean;
  groups: {
    data: SavedContactGroup[] | undefined;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: () => void;
  };
  tags: Option[];
  products: Option[];
  productLabel: { singular: string; plural: string };
  scrapeRuns: Option[];
  /** "Save as group" for hand-picked contacts */
  saveGroup: {
    name: string;
    setName: (name: string) => void;
    onSave: () => void;
    saving: boolean;
  };
}

export function AudiencePicker({
  audienceType, filters, onChange, batchSize, isEmail = false, groups, tags, products, productLabel, scrapeRuns, saveGroup,
}: AudiencePickerProps) {
  const baseId = useId().replace(/:/g, "");

  // The mode the user picked; falls back to what the filters look like (e.g. opened from Contacts)
  const [chosen, setChosen] = useState<Mode>(() => inferMode(audienceType, filters));
  const mode: Mode = audienceType === "ALL"
    ? "everyone"
    : chosen !== "everyone" ? chosen : inferMode(audienceType, filters);

  // Each mode keeps its own selection, so switching back restores it
  const stash = useRef<{ groups?: string[]; custom?: AudienceFilters }>({});

  function selectMode(next: Mode) {
    if (next === mode) return;
    if (mode === "groups") stash.current.groups = filters?.contactGroupIds;
    if (mode === "custom") stash.current.custom = filters;
    setChosen(next);
    if (next === "everyone") onChange("ALL", undefined);
    else if (next === "groups") {
      const ids = stash.current.groups;
      onChange("FILTERED", ids?.length ? { contactGroupIds: ids } : {});
    } else onChange("FILTERED", stash.current.custom ?? {});
  }

  // Roving focus: arrow keys move and select, like native radios
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onModeKeys(e: KeyboardEvent<HTMLDivElement>) {
    const current = MODES.findIndex((m) => m.value === mode);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + MODES.length) % MODES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = MODES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectMode(MODES[next].value);
    radioRefs.current[next]?.focus();
  }

  function update(patch: Partial<AudienceFilters>) {
    onChange("FILTERED", { ...filters, ...patch });
  }

  type ListKey = "leadStatuses" | "sources" | "tagIds" | "productIds" | "contactGroupIds";
  function toggleIn(key: ListKey, value: string) {
    const current = filters?.[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next.length ? next : undefined } as Partial<AudienceFilters>);
  }

  // ─── Groups ───
  const [groupQuery, setGroupQuery] = useState("");
  const sortedGroups = useMemo(() => [...(groups.data ?? [])].sort(byName), [groups.data]);
  const selectedGroupIds = filters?.contactGroupIds ?? [];
  const q = groupQuery.trim().toLowerCase();
  const visibleGroups = q ? sortedGroups.filter((g) => g.name.toLowerCase().includes(q)) : sortedGroups;
  const allVisibleSelected = visibleGroups.length > 0 && visibleGroups.every((g) => selectedGroupIds.includes(g.id));
  const selectedGroups = sortedGroups.filter((g) => selectedGroupIds.includes(g.id));
  // Numbers a check found are not on WhatsApp are skipped by WhatsApp campaigns
  const notOnWhatsApp = isEmail ? 0 : selectedGroups.reduce((sum, g) => sum + (g.whatsapp?.off ?? 0), 0);
  const unchecked = isEmail ? 0 : selectedGroups.reduce((sum, g) => sum + (g.whatsapp?.unchecked ?? 0), 0);
  const groupContacts = selectedGroups.reduce((sum, g) => sum + g.contactCount, 0) - notOnWhatsApp;
  const groupSummary = selectedGroups.length
    ? `${plural(selectedGroups.length, "group")} · ${plural(groupContacts, "contact")} · ${plural(
        Math.ceil(groupContacts / Math.max(1, batchSize)), "batch", "batches",
      )}${notOnWhatsApp ? ` · ${notOnWhatsApp} not on WhatsApp skipped` : ""}${
        unchecked ? ` · ${unchecked} not checked` : ""
      }`
    : "No groups selected";

  function setGroupIds(ids: string[]) {
    update({ contactGroupIds: ids.length ? ids : undefined });
  }

  // ─── Custom ───
  const groupName = (id: string) => sortedGroups.find((g) => g.id === id)?.name ?? "Saved group";
  const optionLabel = (list: Option[], value: string, fallback: string) =>
    list.find((o) => o.value === value)?.label ?? fallback;
  const sourceOptions: Option[] = CONTACT_SOURCES.map((s) => ({ value: s, label: CONTACT_SOURCE_LABELS[s] }));
  const statusOptions: Option[] = LEAD_STATUSES.map((s) => ({ value: s, label: titleCase(s) }));
  const yesNo = (v: boolean | undefined) => (v === true ? "yes" : v === false ? "no" : "");
  const fromYesNo = (v: string) => (v === "yes" ? true : v === "no" ? false : undefined);
  const moreCount =
    (filters?.hasPhone !== undefined ? 1 : 0) +
    (filters?.hasWebsite !== undefined ? 1 : 0) +
    (filters?.dateAdded ? 1 : 0) +
    (filters?.minRating !== undefined ? 1 : 0);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters?.contactIds?.length) {
    chips.push({
      key: "picked",
      label: plural(filters.contactIds.length, "picked contact"),
      onRemove: () => update({ contactIds: undefined }),
    });
  }
  (filters?.contactGroupIds ?? []).forEach((id) =>
    chips.push({ key: `g-${id}`, label: groupName(id), onRemove: () => toggleIn("contactGroupIds", id) }));
  (filters?.leadStatuses ?? []).forEach((s) =>
    chips.push({ key: `s-${s}`, label: titleCase(s), onRemove: () => toggleIn("leadStatuses", s) }));
  (filters?.sources ?? []).forEach((s) =>
    chips.push({ key: `src-${s}`, label: optionLabel(sourceOptions, s, s), onRemove: () => toggleIn("sources", s) }));
  (filters?.tagIds ?? []).forEach((id) =>
    chips.push({ key: `t-${id}`, label: optionLabel(tags, id, "Tag"), onRemove: () => toggleIn("tagIds", id) }));
  (filters?.productIds ?? []).forEach((id) =>
    chips.push({
      key: `p-${id}`,
      label: optionLabel(products, id, productLabel.singular),
      onRemove: () => toggleIn("productIds", id),
    }));
  if (filters?.scrapeRunId) {
    chips.push({
      key: "run",
      label: optionLabel(scrapeRuns, filters.scrapeRunId, "Scraper run"),
      // Rating only applies within a run
      onRemove: () => update({ scrapeRunId: undefined, minRating: undefined }),
    });
  }
  if (filters?.hasPhone !== undefined) {
    chips.push({ key: "phone", label: filters.hasPhone ? "Has phone" : "No phone", onRemove: () => update({ hasPhone: undefined }) });
  }
  if (filters?.hasWebsite !== undefined) {
    chips.push({ key: "web", label: filters.hasWebsite ? "Has website" : "No website", onRemove: () => update({ hasWebsite: undefined }) });
  }
  if (filters?.dateAdded) {
    chips.push({
      key: "added",
      label: `Added ${optionLabel([...DATE_ADDED], filters.dateAdded, "").toLowerCase()}`,
      onRemove: () => update({ dateAdded: undefined }),
    });
  }
  if (filters?.minRating !== undefined) {
    chips.push({ key: "rating", label: `Rating ${filters.minRating}+`, onRemove: () => update({ minRating: undefined }) });
  }

  const hasPicked = !!filters?.contactIds?.length;

  return (
    <div className="space-y-3">
      {/* Mode: segmented control */}
      <div
        role="radiogroup"
        aria-label="Audience"
        data-tour="campaign-audience"
        onKeyDown={onModeKeys}
        className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-1"
      >
        {MODES.map((m, i) => {
          const checked = mode === m.value;
          return (
            <button
              key={m.value}
              ref={(el) => { radioRefs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => selectMode(m.value)}
              className={cn(
                "min-w-0 rounded-lg px-2 py-1.5 text-label font-medium outline-none transition-colors duration-120 ease-standard focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11",
                checked
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Groups: searchable checklist */}
      {mode === "groups" && (
        <div className="border-t border-outline-variant/15 pt-3">
          {groups.isLoading ? (
            <div className="space-y-1.5" role="status" aria-label="Loading saved groups">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-container motion-reduce:animate-none" />
              ))}
            </div>
          ) : groups.isError ? (
            <div className="flex items-center justify-between gap-2" role="alert">
              <p className="text-label text-error">Couldn&apos;t load groups</p>
              <Button type="button" variant="ghost" size="sm" loading={groups.isFetching} onClick={() => groups.refetch()}>
                Retry
              </Button>
            </div>
          ) : sortedGroups.length === 0 ? (
            <p className="text-label text-on-surface-variant">
              No groups yet. Create them on the{" "}
              {/* New tab so the campaign being written isn't lost */}
              <a
                href="/contacts"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline"
              >
                Contacts page
              </a>
              .
            </p>
          ) : (
            <fieldset aria-describedby={`${baseId}-group-summary`}>
              <legend className="sr-only">Saved groups</legend>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${baseId}-group-search`} className="sr-only">Search groups</Label>
                <Input
                  id={`${baseId}-group-search`}
                  type="search"
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  placeholder={sortedGroups.length === 1 ? "Search groups" : `Search ${sortedGroups.length.toLocaleString()} groups`}
                  leadingIcon={<Search />}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-end gap-3">
                {!allVisibleSelected && visibleGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGroupIds([...new Set([...selectedGroupIds, ...visibleGroups.map((g) => g.id)])])}
                    className="rounded text-label font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Select all{q ? " shown" : ""}
                  </button>
                )}
                {selectedGroupIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGroupIds([])}
                    className="rounded text-label font-medium text-on-surface-variant outline-none hover:text-on-surface hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* About five rows, then it scrolls */}
              <ul className="mt-1 max-h-[220px] overflow-y-auto overscroll-contain">
                {visibleGroups.length === 0 ? (
                  <li className="px-2 py-3 text-label text-on-surface-variant">No groups match</li>
                ) : (
                  visibleGroups.map((group) => {
                    const inputId = `${baseId}-group-${group.id}`;
                    return (
                      <li key={group.id}>
                        <label
                          htmlFor={inputId}
                          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-surface-container-low"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={selectedGroupIds.includes(group.id)}
                            onChange={() => toggleIn("contactGroupIds", group.id)}
                            className={CHECK}
                          />
                          <span className="min-w-0 flex-1 truncate text-label text-on-surface">{group.name}</span>
                          <span className="shrink-0 text-right text-caption text-on-surface-variant tabular-nums">
                            {group.contactCount.toLocaleString()}
                            <span className="sr-only"> contacts</span>
                          </span>
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>
              <p
                id={`${baseId}-group-summary`}
                aria-live="polite"
                className="mt-2 border-t border-outline-variant/15 pt-2 text-caption text-on-surface-variant tabular-nums"
              >
                {groupSummary}
              </p>
            </fieldset>
          )}
        </div>
      )}

      {/* Custom: one row of filter dropdowns, chips for what's set */}
      {mode === "custom" && (
        <div className="space-y-2.5 border-t border-outline-variant/15 pt-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filters">
            <FilterMenu label="Status" count={filters?.leadStatuses?.length ?? 0}>
              <Checklist
                legend="Status"
                options={statusOptions}
                selected={filters?.leadStatuses ?? []}
                onToggle={(v) => toggleIn("leadStatuses", v)}
              />
            </FilterMenu>
            <FilterMenu label="Source" count={filters?.sources?.length ?? 0}>
              <Checklist
                legend="Source"
                options={sourceOptions}
                selected={filters?.sources ?? []}
                onToggle={(v) => toggleIn("sources", v)}
              />
            </FilterMenu>
            <FilterMenu label="Tags" count={filters?.tagIds?.length ?? 0}>
              <Checklist
                legend="Tags"
                options={tags}
                selected={filters?.tagIds ?? []}
                onToggle={(v) => toggleIn("tagIds", v)}
                empty="No tags yet"
              />
            </FilterMenu>
            {products.length > 0 && (
              <FilterMenu label={productLabel.plural} count={filters?.productIds?.length ?? 0}>
                <Checklist
                  legend={productLabel.plural}
                  options={products}
                  selected={filters?.productIds ?? []}
                  onToggle={(v) => toggleIn("productIds", v)}
                />
              </FilterMenu>
            )}
            {scrapeRuns.length > 0 && (
              <FilterMenu label="Scraper run" count={filters?.scrapeRunId ? 1 : 0}>
                <RadioList
                  legend="Scraper run"
                  name="run"
                  options={[{ value: "", label: "Any" }, ...scrapeRuns]}
                  value={filters?.scrapeRunId ?? ""}
                  onChange={(v) => update(v ? { scrapeRunId: v } : { scrapeRunId: undefined, minRating: undefined })}
                />
              </FilterMenu>
            )}
            <FilterMenu label="More" count={moreCount}>
              <RadioList
                legend="Phone"
                name="phone"
                options={[{ value: "", label: "Any" }, { value: "yes", label: "Has phone" }, { value: "no", label: "No phone" }]}
                value={yesNo(filters?.hasPhone)}
                onChange={(v) => update({ hasPhone: fromYesNo(v) })}
              />
              <RadioList
                legend="Website"
                name="website"
                options={[{ value: "", label: "Any" }, { value: "yes", label: "Has website" }, { value: "no", label: "No website" }]}
                value={yesNo(filters?.hasWebsite)}
                onChange={(v) => update({ hasWebsite: fromYesNo(v) })}
              />
              <RadioList
                legend="Added"
                name="added"
                options={[{ value: "", label: "Any time" }, ...DATE_ADDED]}
                value={filters?.dateAdded ?? ""}
                onChange={(v) => update({ dateAdded: (v || undefined) as AudienceFilters["dateAdded"] })}
              />
              {filters?.scrapeRunId && (
                <RadioList
                  legend="Rating"
                  name="rating"
                  options={[{ value: "", label: "Any" }, ...RATINGS.map((r) => ({ value: String(r), label: `${r}+` }))]}
                  value={filters.minRating?.toString() ?? ""}
                  onChange={(v) => update({ minRating: v ? Number(v) : undefined })}
                />
              )}
            </FilterMenu>
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
              <button
                type="button"
                onClick={() => onChange("FILTERED", {})}
                className="ml-1 rounded text-label font-medium text-on-surface-variant outline-none hover:text-on-surface hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              >
                Clear all
              </button>
            </div>
          ) : (
            <p className="text-caption text-on-surface-variant">Add a filter to narrow your audience.</p>
          )}

          {hasPicked && (
            <div className="space-y-1.5">
              <Label htmlFor={`${baseId}-save-group`} className="sr-only">Group name for picked contacts</Label>
              <div className="flex gap-2 max-lg:min-w-0">
                <Input
                  id={`${baseId}-save-group`}
                  placeholder="Save picked contacts as group…"
                  maxLength={100}
                  value={saveGroup.name}
                  aria-describedby={`${baseId}-save-group-hint`}
                  onChange={(e) => saveGroup.setName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  disabled={!saveGroup.name.trim() || saveGroup.saving}
                  loading={saveGroup.saving}
                  onClick={saveGroup.onSave}
                >
                  Save
                </Button>
              </div>
              <p id={`${baseId}-save-group-hint`} className="text-caption text-on-surface-variant">
                Contacts leave any older group.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
