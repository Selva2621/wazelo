"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Map, Briefcase, Globe, Search, Linkedin, Play,
  Loader2, Users, ArrowRight,
  Trash2, RotateCcw, Copy,
  StickyNote, X, Ban, Sparkles,
} from "lucide-react";
import {
  useScrapeRuns, useTriggerScrapeRun,
  useDeleteScrapeRun, useReRunScrape, useCancelScrapeRun,
} from "@/hooks/use-lead-scraper";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import type { ScrapeSource, ScrapeRunStatus, ScrapeRun, LeadFilters } from "@/lib/types/lead-scraper";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ScrapeFilters, countActiveFilters, DEFAULT_LEAD_FILTERS } from "@/components/lead-scraper/scrape-filters";
import { SuggestInput, SuggestMulti, SuggestionChips, type RecentSearch } from "@/components/lead-scraper/business-type-input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { KEYWORD_ALIASES, KEYWORD_SUGGESTIONS, mapsTipFor, suggestedFor } from "@/lib/constants/scraper-suggestions";
import { useOrgSettings } from "@/hooks/use-settings";
import { DEFAULT_COUNTRY_CODE, getCountry } from "@/lib/constants/countries";
import { CountrySelect } from "@/components/ui/country-select";

/** "Gym, Fitness centre" → ["Gym", "Fitness centre"] — mirrors the backend split */
function splitTerms(keywords: string) {
  return keywords.split(",").map((t) => t.trim()).filter(Boolean);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const SCRAPERS: {
  source: ScrapeSource;
  icon: React.ReactNode;
  title: string;
  description: string;
  bestFor: string;
  locationLabel?: string;
  keywordsLabel: string;
  keywordsPlaceholder: string;
  locationPlaceholder?: string;
}[] = [
  {
    source: "GOOGLE_MAPS",
    icon: <Map className="w-6 h-6" />,
    title: "Google Maps",
    description: "Find local businesses by search query",
    bestFor: "Designers, agencies, local B2B",
    keywordsLabel: "Business type",
    keywordsPlaceholder: "Gym",
    locationPlaceholder: "Mumbai, India",
    locationLabel: "City / Region",
  },
  {
    source: "UPWORK_JOBS",
    icon: <Briefcase className="w-6 h-6" />,
    title: "Upwork Jobs",
    description: "Scrape job postings from Upwork",
    bestFor: "Developers, designers, copywriters",
    keywordsLabel: "Job category",
    keywordsPlaceholder: "React developer",
    locationPlaceholder: "India",
    locationLabel: "Location filter",
  },
  {
    source: "FREELANCER_IN",
    icon: <Globe className="w-6 h-6" />,
    title: "Freelancer.in",
    description: "Browse active projects on Freelancer.com",
    bestFor: "Indian freelancers",
    keywordsLabel: "Project type",
    keywordsPlaceholder: "Logo design",
  },
  {
    source: "TRUELANCER",
    icon: <Search className="w-6 h-6" />,
    title: "Truelancer",
    description: "Find projects on Truelancer",
    bestFor: "Indian freelancers",
    keywordsLabel: "Project type",
    keywordsPlaceholder: "WordPress website",
  },
  {
    source: "LINKEDIN_JOBS",
    icon: <Linkedin className="w-6 h-6" />,
    title: "LinkedIn Jobs",
    description: "Extract job postings from LinkedIn",
    bestFor: "B2B & SaaS consultants",
    keywordsLabel: "Job title",
    keywordsPlaceholder: "Product manager",
    locationPlaceholder: "Bangalore, India",
    locationLabel: "Location",
  },
];

const SOURCE_LABELS: Record<ScrapeSource, string> = {
  GOOGLE_MAPS: "Google Maps",
  UPWORK_JOBS: "Upwork Jobs",
  FREELANCER_IN: "Freelancer.in",
  TRUELANCER: "Truelancer",
  LINKEDIN_JOBS: "LinkedIn Jobs",
};

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "GOOGLE_MAPS", label: "Google Maps" },
  { value: "UPWORK_JOBS", label: "Upwork Jobs" },
  { value: "FREELANCER_IN", label: "Freelancer.in" },
  { value: "TRUELANCER", label: "Truelancer" },
  { value: "LINKEDIN_JOBS", label: "LinkedIn Jobs" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "COMPLETED", label: "Done" },
  { value: "RUNNING", label: "Running" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ScrapeRunStatus, { label: string; variant: "muted" | "primary" | "success" | "error" }> = {
  PENDING:   { label: "Pending",   variant: "muted" },
  RUNNING:   { label: "Running",   variant: "primary" },
  COMPLETED: { label: "Done",      variant: "success" },
  FAILED:    { label: "Failed",    variant: "error" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
};

function StatusBadge({ status }: { status: ScrapeRunStatus }) {
  const { label, variant } = STATUS_BADGE[status];
  return (
    <Badge variant={variant} dot pulse={status === "RUNNING"}>
      {label}
    </Badge>
  );
}

/** Notes are stored client-side in localStorage per run */
const noteKey = (runId: string) => `scrape-run-note-${runId}`;

function readStoredNote(runId: string) {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(noteKey(runId)) ?? "";
  } catch {
    return "";
  }
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Note editor ──────────────────────────────────────────────────────────────

function NoteEditor({ runId, initial, onClose }: { runId: string; initial: string; onClose: (val: string) => void }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="mt-3 border-t border-outline-variant/20 pt-3 space-y-2">
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Add a note about this run…"
        rows={2}
        className="w-full text-label bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => onClose(val)}
          className="text-label font-medium text-primary hover:underline"
        >
          Save
        </button>
        <button
          onClick={() => onClose(initial)}
          className="text-label text-on-surface-variant hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Run history actions ──────────────────────────────────────────────────────

function RunActions({
  run,
  hasNote,
  onToggleNote,
  onDuplicate,
}: {
  run: ScrapeRun;
  hasNote: boolean;
  onToggleNote: () => void;
  onDuplicate: (run: ScrapeRun) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useDeleteScrapeRun();
  const reRunMutation = useReRunScrape();
  const cancelMutation = useCancelScrapeRun();

  const handleDelete = () => {
    deleteMutation.mutate(run.id, { onSuccess: () => setConfirmDelete(false) });
  };

  const isActive = run.status === "PENDING" || run.status === "RUNNING";

  return (
        <div className="flex items-center justify-end gap-1 max-lg:justify-start max-lg:gap-2">
          {/* Note toggle */}
          <button
            onClick={onToggleNote}
            title="Add / edit note"
            aria-label="Add / edit note"
            className={`p-1.5 rounded-lg hover:bg-surface-container transition-colors max-lg:p-3 ${hasNote ? "text-primary" : "text-on-surface-variant"}`}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate / use as template */}
          <IconButton size="xs" className="max-lg:size-10"
            onClick={() => onDuplicate(run)}
            title="Duplicate — copy settings to form" aria-label="Duplicate — copy settings to form">
            <Copy className="w-3.5 h-3.5" />
          </IconButton>

          {/* Re-run */}
          <button
            onClick={() => reRunMutation.mutate(run.id)}
            disabled={reRunMutation.isPending || isActive}
            title="Re-run same search"
            aria-label="Re-run same search"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors max-lg:p-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {reRunMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Cancel */}
          {isActive && (
            <IconButton size="xs" className="max-lg:size-10" variant="danger"
              onClick={() => cancelMutation.mutate(run.id)}
              disabled={cancelMutation.isPending}
              title="Cancel run" aria-label="Cancel run">
              {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
            </IconButton>
          )}

          {/* Delete */}
          {!isActive && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-caption font-semibold text-error hover:underline px-1"
                >
                  {deleteMutation.isPending ? "…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-caption text-on-surface-variant hover:underline px-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <IconButton size="xs" className="max-lg:size-10" variant="danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete run" aria-label="Delete run">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            )
          )}
        </div>
  );
}

// ─── Run history cells ────────────────────────────────────────────────────────

function RunResults({ run }: { run: ScrapeRun }) {
  const isActive = run.status === "PENDING" || run.status === "RUNNING";
  if (run.status === "COMPLETED" && run.resultCount > 0) {
    return (
      <div className="min-w-0">
        <Link
          href={`/leads/scraper/${run.id}`}
          className="inline-flex items-center gap-1 text-body font-medium text-primary hover:underline"
        >
          View {run.resultCount} result{run.resultCount !== 1 ? "s" : ""}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {(run.importedCount > 0 || run.skippedCount > 0) && (
          <p className="text-caption text-on-surface-variant">
            {[
              run.importedCount > 0 && `${run.importedCount} imported`,
              run.skippedCount > 0 && `${run.skippedCount} duplicates removed`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    );
  }
  if (run.status === "COMPLETED") {
    return <span className="text-label text-on-surface-variant">No results found for this search.</span>;
  }
  if (isActive) {
    return (
      <Link
        href={`/leads/scraper/${run.id}`}
        className="inline-flex items-center gap-1 text-body font-medium text-on-surface-variant hover:text-primary hover:underline"
      >
        Monitor run <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    );
  }
  return <span className="text-label text-on-surface-variant/50">—</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadScraperPage() {
  // Form state
  const [selected, setSelected] = useState<ScrapeSource | null>(null);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [leadFilters, setLeadFilters] = useState<LeadFilters>(DEFAULT_LEAD_FILTERS);

  // Run list filters
  const [filterSource, setFilterSource] = useState<ScrapeSource | "">("");
  const [filterStatus, setFilterStatus] = useState<ScrapeRunStatus | "">("");
  const [page, setPage] = useState(0);

  const trigger = useTriggerScrapeRun();

  const queryParams = {
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    ...(filterStatus ? { status: filterStatus as ScrapeRunStatus } : {}),
    ...(filterSource ? { source: filterSource as ScrapeSource } : {}),
  };

  const { data, isLoading } = useScrapeRuns(queryParams);
  const hasActiveRuns = data?.runs.some((r) => r.status === "PENDING" || r.status === "RUNNING");
  const { data: liveData } = useScrapeRuns(queryParams, hasActiveRuns ? 5000 : undefined);
  const runs = (liveData ?? data)?.runs ?? [];
  const total = (liveData ?? data)?.total ?? 0;

  // Run notes: saved edits this session win over what localStorage held
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const noteFor = (runId: string) => noteEdits[runId] ?? readStoredNote(runId);
  const toggleNote = (runId: string) => {
    const next = new Set(openNotes);
    if (next.has(runId)) next.delete(runId);
    else next.add(runId);
    setOpenNotes(next);
  };
  const closeNote = (runId: string, val: string) => {
    setNoteEdits((n) => ({ ...n, [runId]: val }));
    try {
      localStorage.setItem(noteKey(runId), val);
    } catch {
      // Storage blocked: the note still shows for this session
    }
    const next = new Set(openNotes);
    next.delete(runId);
    setOpenNotes(next);
  };

  const selectedScraper = SCRAPERS.find((s) => s.source === selected);

  // Google Maps takes several types as chips — one search each; `pendingType` is typed but not yet added
  const [pendingType, setPendingType] = useState("");
  const isMaps = selected === "GOOGLE_MAPS";
  const mapsTypes = splitTerms(keywords);
  const searchKeywords = isMaps
    ? [...mapsTypes, pendingType.trim()].filter(Boolean).join(", ")
    : keywords.trim();

  // Past searches for this source, newest first, one per keywords + location
  const { data: recentData } = useScrapeRuns({ take: 50 });
  const recentSearches = useMemo<RecentSearch[]>(() => {
    const seen = new Set<string>();
    return (recentData?.runs ?? [])
      .filter((r) => r.source === selected)
      .filter((r) => {
        const key = `${r.keywords.toLowerCase()}|${(r.location ?? "").toLowerCase()}`;
        return !seen.has(key) && seen.add(key);
      })
      .map((r) => ({ keywords: r.keywords, location: r.location ?? undefined, resultCount: r.resultCount }));
  }, [recentData, selected]);

  // Picks for the org's line of work (chosen in onboarding)
  const { data: orgSettings } = useOrgSettings();
  const suggested = selected ? suggestedFor(orgSettings?.freelancerTypes, selected) : [];
  const mapsTip = isMaps ? mapsTipFor(orgSettings?.freelancerTypes) : undefined;
  const tipApplied = !!mapsTip && Object.entries(mapsTip.filters).every(
    ([k, v]) => leadFilters[k as keyof LeadFilters] === v,
  );

  // Maps phones without a country code get this country's — the org's unless changed
  const [pickedCountry, setPickedCountry] = useState<string | null>(null);
  const scrapeCountry = pickedCountry ?? orgSettings?.country ?? DEFAULT_COUNTRY_CODE;

  const pickRecent = (r: RecentSearch) => {
    setKeywords(r.keywords);
    setLocation(r.location ?? "");
    setPendingType("");
  };

  function handleRun() {
    if (!selected || !searchKeywords) return;
    trigger.mutate(
      {
        source: selected,
        keywords: searchKeywords,
        location: location.trim() || undefined,
        maxResults,
        ...(isMaps
          ? { filters: { ...leadFilters, country: scrapeCountry } }
          : countActiveFilters(leadFilters) > 0 && { filters: leadFilters }),
      },
      {
        onSuccess: () => {
          setKeywords("");
          setPendingType("");
          setLocation("");
          setLeadFilters(DEFAULT_LEAD_FILTERS);
          setSelected(null);
          // Go back to page 0 to see the new run
          setPage(0);
          setFilterSource("");
          setFilterStatus("");
        },
      },
    );
  }

  function handleDuplicate(run: ScrapeRun) {
    setSelected(run.source);
    setKeywords(run.keywords);
    setPendingType("");
    setLocation(run.location ?? "");
    setMaxResults(run.maxResults);
    setLeadFilters(run.filters ?? {});
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeFilterCount = [filterSource !== "", filterStatus !== ""].filter(Boolean).length;

  // Phones: the picked scraper's form opens as a sheet over the catalog (desktop: inline below it)
  const isMobile = useIsMobile();

  const keywordInput = selectedScraper && (isMaps ? (
    <SuggestMulti
      large
      groups={KEYWORD_SUGGESTIONS.GOOGLE_MAPS}
      aliases={KEYWORD_ALIASES.GOOGLE_MAPS}
      recent={recentSearches}
      onPickRecent={pickRecent}
      suggested={suggested}
      value={mapsTypes}
      onChange={(types) => setKeywords(types?.join(", ") ?? "")}
      text={pendingType}
      onTextChange={setPendingType}
      onEnter={handleRun}
      placeholder="Type or pick — e.g. Gym, parlour"
    />
  ) : (
    <SuggestInput
      groups={KEYWORD_SUGGESTIONS[selectedScraper.source]}
      aliases={KEYWORD_ALIASES[selectedScraper.source]}
      recent={recentSearches}
      onPickRecent={pickRecent}
      suggested={suggested}
      value={keywords}
      onChange={setKeywords}
      onEnter={handleRun}
      placeholder={`Type or pick — e.g. ${selectedScraper.keywordsPlaceholder}`}
    />
  ));

  // A suggestion chip adds a type (Maps) or fills the single keyword field, like the dropdown
  const pickChip = (item: string) => {
    if (!isMaps) return setKeywords(item);
    if (!mapsTypes.some((t) => t.toLowerCase() === item.toLowerCase())) setKeywords([...mapsTypes, item].join(", "));
  };

  const mapsTipLine = mapsTip && !tipApplied && (
    <p className="flex items-center gap-1.5 text-caption text-on-surface-variant mt-1.5">
      <Sparkles className="w-3 h-3 text-primary shrink-0" />
      Tip: {mapsTip.text}
      <button
        type="button"
        onClick={() => setLeadFilters((f) => ({ ...f, ...mapsTip.filters }))}
        className="font-medium text-primary hover:underline max-lg:min-h-11 max-lg:px-1"
      >
        Apply
      </button>
    </p>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 max-lg:space-y-6">
      {/* Header (the iOS nav bar shows the title on mobile) */}
      <PageHeader className="max-lg:hidden" title="Lead scraper" description="Search a source, review, then import" />

      {/* Scraper catalog */}
      <div data-tour="scraper-sources">
        <h2 className="text-title-sm font-semibold text-on-surface mb-3">Pick a scraper</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SCRAPERS.map((s) => (
            <button
              key={s.source}
              onClick={() => { setSelected(s.source); setKeywords(""); setPendingType(""); setLocation(""); setMaxResults(20); setLeadFilters(DEFAULT_LEAD_FILTERS); }}
              className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                selected === s.source
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-outline-variant bg-surface-container-low hover:border-primary/40"
              }`}
            >
              <span className={selected === s.source ? "text-primary" : "text-on-surface-variant"}>
                {s.icon}
              </span>
              <div>
                <p className="text-body-lg font-semibold text-on-surface">{s.title}</p>
                <p className="text-caption text-on-surface-variant mt-0.5 leading-tight">{s.description}</p>
              </div>
              <span className="text-caption bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">
                {s.bestFor}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Config form */}
      {selectedScraper && !isMobile && (
        <div data-tour="scraper-form" className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 space-y-4 max-lg:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-on-surface">Configure {selectedScraper.title} Search</h2>
            <button aria-label="Close" onClick={() => setSelected(null)} className="text-on-surface-variant hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label font-medium text-on-surface-variant block mb-1">
                {isMaps ? "Business types" : selectedScraper.keywordsLabel} <span className="text-error">*</span>
              </label>
              {keywordInput}
              {isMaps && mapsTypes.length > 1 && (
                <p className="text-caption text-on-surface-variant/70 mt-1">
                  {mapsTypes.length} searches in one run — duplicates removed, Max Results shared between them.
                </p>
              )}
              {mapsTipLine}
            </div>
            {selectedScraper.locationPlaceholder && (
              <div>
                <label className="text-label font-medium text-on-surface-variant block mb-1">
                  {selectedScraper.locationLabel ?? "Location"} (optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRun()}
                  placeholder={selectedScraper.locationPlaceholder}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                />
              </div>
            )}
            {isMaps && (
              <div>
                <label htmlFor="scrape-country" className="text-label font-medium text-on-surface-variant block mb-1">
                  Country
                </label>
                <CountrySelect
                  id="scrape-country"
                  value={scrapeCountry}
                  onChange={setPickedCountry}
                  showDialCode
                  className="rounded-xl border-outline-variant bg-surface-container"
                />
                <p className="mt-1 text-caption text-on-surface-variant">
                  Numbers found without a country code get +{getCountry(scrapeCountry).dialCode}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-label font-medium text-on-surface-variant block mb-1">
              Max Results: <span className="text-on-surface font-semibold">{maxResults}</span>
            </label>
            <input
              type="range" min={5} max={100} step={5} value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-caption text-on-surface-variant mt-0.5">
              <span>5</span><span>100</span>
            </div>
            {selectedScraper.source === "GOOGLE_MAPS" && (
              <p className="text-caption text-on-surface-variant/70 mt-1">
                Google Maps visits each place detail page — higher limits take more time.
              </p>
            )}
          </div>

          <ScrapeFilters
            key={selectedScraper.source}
            source={selectedScraper.source}
            value={leadFilters}
            onChange={setLeadFilters}
            hasLocation={location.trim() !== ""}
          />

          <Button size="lg"
            onClick={handleRun}
            disabled={!searchKeywords || trigger.isPending}
           
          >
            {trigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Scraper
          </Button>
        </div>
      )}

      {/* Phones: same form in a sheet, sized to one screen, Run pinned to the bottom */}
      {isMobile && (
        <Modal open={!!selectedScraper} onClose={() => setSelected(null)} aria-labelledby="scrape-form-title">
          {() => selectedScraper && (
            <>
              <div className="flex items-center gap-2 pl-4 pr-2 pt-4">
                <span className="text-primary [&_svg]:size-5">{selectedScraper.icon}</span>
                <h2 id="scrape-form-title" className="min-w-0 flex-1 truncate text-title-sm font-semibold text-on-surface">
                  {selectedScraper.title}
                </h2>
                <IconButton aria-label="Close" onClick={() => setSelected(null)} className="size-11 rounded-full">
                  <X className="w-5 h-5" />
                </IconButton>
              </div>

              <div className="space-y-4 px-4 pb-4">
                <div>
                  <p className="text-label font-medium text-on-surface-variant mb-1">
                    {isMaps ? "Business types" : selectedScraper.keywordsLabel} <span className="text-error">*</span>
                  </p>
                  {keywordInput}
                  <SuggestionChips
                    label="Suggestions"
                    groups={KEYWORD_SUGGESTIONS[selectedScraper.source]}
                    recent={recentSearches}
                    onPickRecent={pickRecent}
                    suggested={suggested}
                    exclude={isMaps ? mapsTypes : [keywords]}
                    onPick={pickChip}
                  />
                  {isMaps && mapsTypes.length > 1 && (
                    <p className="text-caption text-on-surface-variant mt-1">
                      {mapsTypes.length} searches in one run, results shared
                    </p>
                  )}
                  {mapsTipLine}
                </div>

                {(selectedScraper.locationPlaceholder || isMaps) && (
                  <div>
                    <div className={`grid gap-3 ${selectedScraper.locationPlaceholder && isMaps ? "grid-cols-2" : "grid-cols-1"}`}>
                      {selectedScraper.locationPlaceholder && (
                        <div className="min-w-0">
                          <label htmlFor="scrape-location-mobile" className="text-label font-medium text-on-surface-variant block mb-1 truncate">
                            {selectedScraper.locationLabel ?? "Location"}
                          </label>
                          <input
                            id="scrape-location-mobile"
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRun()}
                            placeholder={selectedScraper.locationPlaceholder}
                            enterKeyHint="go"
                            className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}
                      {isMaps && (
                        <div className="min-w-0">
                          <label htmlFor="scrape-country-mobile" className="text-label font-medium text-on-surface-variant block mb-1">
                            Country
                          </label>
                          <CountrySelect
                            id="scrape-country-mobile"
                            value={scrapeCountry}
                            onChange={setPickedCountry}
                            showDialCode
                            className="h-11 w-full rounded-xl border-outline-variant bg-surface-container"
                          />
                        </div>
                      )}
                    </div>
                    {isMaps && (
                      <p className="mt-1 text-caption text-on-surface-variant">
                        Numbers without a code get +{getCountry(scrapeCountry).dialCode}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="scrape-max-mobile" className="text-label font-medium text-on-surface-variant">
                      Max results
                    </label>
                    <span className="text-body font-semibold tabular-nums text-on-surface">{maxResults}</span>
                  </div>
                  <input
                    id="scrape-max-mobile"
                    type="range" min={5} max={100} step={5} value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="h-11 w-full accent-primary"
                  />
                </div>

                <ScrapeFilters
                  key={selectedScraper.source}
                  source={selectedScraper.source}
                  value={leadFilters}
                  onChange={setLeadFilters}
                  hasLocation={location.trim() !== ""}
                />
              </div>

              <ModalFooter className="border-t border-outline-variant/40 px-4 pt-3">
                <Button size="lg" onClick={handleRun} disabled={!searchKeywords || trigger.isPending} className="w-full">
                  {trigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run scraper
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      )}

      {/* Run history */}
      <div className="space-y-4">
        {/* Section header + filters */}
        <div data-tour="scraper-runs" className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h2 className="text-title-sm font-semibold text-on-surface">Recent runs</h2>
            {total > 0 && (
              <span className="text-body tabular-nums text-on-surface-variant">{total}</span>
            )}
          </div>

          <FilterBar className="mobile-scroll-x max-lg:w-full">
            <FilterSelect
              label="Source"
              active={filterSource !== ""}
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value as ScrapeSource | ""); setPage(0); }}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Status"
              active={filterStatus !== ""}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as ScrapeRunStatus | ""); setPage(0); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setFilterSource(""); setFilterStatus(""); setPage(0); }}
                className="flex items-center gap-1 rounded-md px-1 text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </FilterBar>
        </div>

        {/* Run list */}
        <DataTable
          label="Scraper runs"
          columns={[
            {
              id: "search",
              header: "Search",
              cell: (run) => {
                const note = noteFor(run.id);
                return (
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-on-surface">{SOURCE_LABELS[run.source]}</p>
                    <p className="truncate text-caption text-on-surface-variant">
                      <span className="font-medium">{run.keywords}</span>
                      {run.location && <> · {run.location}</>}
                      <span> · max {run.maxResults}</span>
                    </p>
                    {note && !openNotes.has(run.id) && (
                      <p className="mt-1 text-caption text-on-surface-variant italic flex items-center gap-1 max-lg:[overflow-wrap:anywhere]">
                        <StickyNote className="w-3 h-3 shrink-0" />
                        {note}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              id: "status",
              header: "Status",
              className: "w-28",
              skeleton: "badge",
              cell: (run) => <StatusBadge status={run.status} />,
            },
            {
              id: "results",
              header: "Results",
              className: "w-48",
              cell: (run) => <RunResults run={run} />,
            },
            {
              id: "created",
              header: "Created",
              className: "w-24",
              skeleton: "short",
              cellClassName: "text-caption text-on-surface-variant",
              cell: (run) => formatTimeAgo(run.createdAt),
            },
            {
              id: "actions",
              header: "Actions",
              hideHeader: true,
              align: "right",
              className: "w-44",
              skeleton: "none",
              cell: (run) => (
                <RunActions
                  run={run}
                  hasNote={!!noteFor(run.id)}
                  onToggleNote={() => toggleNote(run.id)}
                  onDuplicate={handleDuplicate}
                />
              ),
            },
          ]}
          rows={runs}
          rowKey={(run) => run.id}
          rowLabel={(run) => `${SOURCE_LABELS[run.source]} — ${run.keywords}`}
          loading={isLoading}
          skeletonRows={4}
          // Detail row: the note editor and a failed run's error
          renderExpandedRow={(run) => (
            <>
              {run.status === "FAILED" && run.errorMessage && (
                <p className="text-label text-error bg-error/5 rounded-lg px-3 py-2 max-lg:[overflow-wrap:anywhere]">{run.errorMessage}</p>
              )}
              {openNotes.has(run.id) && (
                <NoteEditor runId={run.id} initial={noteFor(run.id)} onClose={(val) => closeNote(run.id, val)} />
              )}
            </>
          )}
          isRowExpanded={(run) => openNotes.has(run.id) || (run.status === "FAILED" && !!run.errorMessage)}
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
          empty={
            activeFilterCount > 0
              ? {
                  icon: <Users className="h-8 w-8" />,
                  title: "No runs match the current filters.",
                  compact: true,
                  actionLabel: "Clear filters",
                  onAction: () => { setFilterSource(""); setFilterStatus(""); setPage(0); },
                }
              : {
                  icon: <Users className="h-8 w-8" />,
                  title: "No scraper runs yet.",
                  description: "Pick a scraper above and click Run to find leads.",
                  compact: true,
                }
          }
        />
      </div>
    </div>
  );
}
