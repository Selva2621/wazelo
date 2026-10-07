"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Map, Briefcase, Globe, Search, Linkedin, Play, Clock,
  CheckCircle2, XCircle, Loader2, Users, ArrowRight,
  Trash2, RotateCcw, Copy, ChevronLeft, ChevronRight,
  Filter, StickyNote, X, ChevronDown,
} from "lucide-react";
import {
  useScrapeRuns, useTriggerScrapeRun,
  useDeleteScrapeRun, useReRunScrape,
} from "@/hooks/use-lead-scraper";
import { Spinner } from "@/components/ui/spinner";
import type { ScrapeSource, ScrapeRunStatus, ScrapeRun } from "@/lib/types/lead-scraper";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const SCRAPERS: {
  source: ScrapeSource;
  icon: React.ReactNode;
  title: string;
  description: string;
  bestFor: string;
  locationLabel?: string;
  keywordsPlaceholder: string;
  locationPlaceholder?: string;
}[] = [
  {
    source: "GOOGLE_MAPS",
    icon: <Map className="w-6 h-6" />,
    title: "Google Maps",
    description: "Find local businesses by search query",
    bestFor: "Designers, agencies, local B2B",
    keywordsPlaceholder: "web design agency",
    locationPlaceholder: "Mumbai, India",
    locationLabel: "City / Region",
  },
  {
    source: "UPWORK_JOBS",
    icon: <Briefcase className="w-6 h-6" />,
    title: "Upwork Jobs",
    description: "Scrape job postings from Upwork",
    bestFor: "Developers, designers, copywriters",
    keywordsPlaceholder: "react developer",
    locationPlaceholder: "India",
    locationLabel: "Location filter",
  },
  {
    source: "FREELANCER_IN",
    icon: <Globe className="w-6 h-6" />,
    title: "Freelancer.in",
    description: "Browse active projects on Freelancer.com",
    bestFor: "Indian freelancers",
    keywordsPlaceholder: "logo design",
  },
  {
    source: "TRUELANCER",
    icon: <Search className="w-6 h-6" />,
    title: "Truelancer",
    description: "Find projects on Truelancer",
    bestFor: "Indian freelancers",
    keywordsPlaceholder: "wordpress developer",
  },
  {
    source: "LINKEDIN_JOBS",
    icon: <Linkedin className="w-6 h-6" />,
    title: "LinkedIn Jobs",
    description: "Extract job postings from LinkedIn",
    bestFor: "B2B & SaaS consultants",
    keywordsPlaceholder: "product manager",
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
  { value: "", label: "All Sources" },
  { value: "GOOGLE_MAPS", label: "Google Maps" },
  { value: "UPWORK_JOBS", label: "Upwork Jobs" },
  { value: "FREELANCER_IN", label: "Freelancer.in" },
  { value: "TRUELANCER", label: "Truelancer" },
  { value: "LINKEDIN_JOBS", label: "LinkedIn Jobs" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "COMPLETED", label: "Done" },
  { value: "RUNNING", label: "Running" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScrapeRunStatus }) {
  const config: Record<ScrapeRunStatus, { label: string; className: string; icon: React.ReactNode }> = {
    PENDING:   { label: "Pending",  className: "bg-surface-container text-on-surface-variant",  icon: <Clock className="w-3 h-3" /> },
    RUNNING:   { label: "Running",  className: "bg-primary/10 text-primary",                    icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    COMPLETED: { label: "Done",     className: "bg-success/10 text-success",                    icon: <CheckCircle2 className="w-3 h-3" /> },
    FAILED:    { label: "Failed",   className: "bg-error/10 text-error",                        icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, className, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-label font-medium px-2 py-0.5 rounded-full ${className}`}>
      {icon} {label}
    </span>
  );
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

// ─── Run history row ──────────────────────────────────────────────────────────

function RunRow({
  run,
  onDuplicate,
}: {
  run: ScrapeRun;
  onDuplicate: (run: ScrapeRun) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNote, setShowNote] = useState(false);
  // Notes stored client-side in localStorage per run
  const noteKey = `scrape-run-note-${run.id}`;
  const [note, setNote] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(noteKey) ?? "";
  });

  const deleteMutation = useDeleteScrapeRun();
  const reRunMutation = useReRunScrape();

  const handleDelete = () => {
    deleteMutation.mutate(run.id, { onSuccess: () => setConfirmDelete(false) });
  };

  const handleNoteClose = (val: string) => {
    setNote(val);
    localStorage.setItem(noteKey, val);
    setShowNote(false);
  };

  const isActive = run.status === "PENDING" || run.status === "RUNNING";

  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-body-lg text-on-surface">{SOURCE_LABELS[run.source]}</span>
            <StatusBadge status={run.status} />
            {run.status === "COMPLETED" && run.resultCount > 0 && (
              <span className="text-label text-on-surface-variant">
                {run.resultCount} found
                {run.importedCount > 0 && ` · ${run.importedCount} imported`}
              </span>
            )}
          </div>
          <p className="text-label text-on-surface-variant mt-0.5 truncate">
            <span className="font-medium">{run.keywords}</span>
            {run.location && <> · {run.location}</>}
            <span className="ml-2">· max {run.maxResults}</span>
          </p>
          {note && !showNote && (
            <p className="mt-1 text-caption text-on-surface-variant italic flex items-center gap-1">
              <StickyNote className="w-3 h-3 shrink-0" />
              {note}
            </p>
          )}
        </div>

        {/* Right: time + actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-label text-on-surface-variant mr-1">{formatTimeAgo(run.createdAt)}</span>

          {/* Note toggle */}
          <button
            onClick={() => setShowNote((v) => !v)}
            title="Add / edit note"
            className={`p-1.5 rounded-lg hover:bg-surface-container transition-colors ${note ? "text-primary" : "text-on-surface-variant"}`}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate / use as template */}
          <IconButton size="xs"
            onClick={() => onDuplicate(run)}
            title="Duplicate — copy settings to form" aria-label="Duplicate — copy settings to form">
            <Copy className="w-3.5 h-3.5" />
          </IconButton>

          {/* Re-run */}
          <button
            onClick={() => reRunMutation.mutate(run.id)}
            disabled={reRunMutation.isPending || isActive}
            title="Re-run same search"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {reRunMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
          </button>

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
              <IconButton size="xs" variant="danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete run" aria-label="Delete run">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            )
          )}
        </div>
      </div>

      {/* Note editor */}
      {showNote && <NoteEditor runId={run.id} initial={note} onClose={handleNoteClose} />}

      {/* Error */}
      {run.status === "FAILED" && run.errorMessage && (
        <p className="mt-2 text-label text-error bg-error/5 rounded-lg px-3 py-2">{run.errorMessage}</p>
      )}

      {/* View / Monitor link */}
      {run.status === "COMPLETED" && run.resultCount > 0 && (
        <div className="mt-3 border-t border-outline-variant/20 pt-3">
          <Link
            href={`/leads/scraper/${run.id}`}
            className="inline-flex items-center gap-1.5 text-body-lg font-medium text-primary hover:underline"
          >
            View {run.resultCount} result{run.resultCount !== 1 ? "s" : ""}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      {run.status === "COMPLETED" && run.resultCount === 0 && (
        <p className="mt-2 text-label text-on-surface-variant">No results found for this search.</p>
      )}
      {isActive && (
        <div className="mt-3 border-t border-outline-variant/20 pt-3">
          <Link
            href={`/leads/scraper/${run.id}`}
            className="inline-flex items-center gap-1.5 text-body-lg font-medium text-on-surface-variant hover:text-primary hover:underline"
          >
            Monitor run <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadScraperPage() {
  // Form state
  const [selected, setSelected] = useState<ScrapeSource | null>(null);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);

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
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selectedScraper = SCRAPERS.find((s) => s.source === selected);

  function handleRun() {
    if (!selected || !keywords.trim()) return;
    trigger.mutate(
      { source: selected, keywords: keywords.trim(), location: location.trim() || undefined, maxResults },
      {
        onSuccess: () => {
          setKeywords("");
          setLocation("");
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
    setLocation(run.location ?? "");
    setMaxResults(run.maxResults);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeFilterCount = [filterSource !== "", filterStatus !== ""].filter(Boolean).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-headline font-semibold text-on-surface">Lead Scraper</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Pick a source, search for leads, review the results, then import the ones you want.
        </p>
      </div>

      {/* Scraper catalog */}
      <div>
        <h2 className="text-body-lg font-semibold text-on-surface mb-3">Pick a Scraper</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SCRAPERS.map((s) => (
            <button
              key={s.source}
              onClick={() => { setSelected(s.source); setKeywords(""); setLocation(""); setMaxResults(20); }}
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
      {selectedScraper && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-on-surface">Configure {selectedScraper.title} Search</h2>
            <button aria-label="Close" onClick={() => setSelected(null)} className="text-on-surface-variant hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label font-medium text-on-surface-variant block mb-1">
                Keywords <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRun()}
                placeholder={selectedScraper.keywordsPlaceholder}
                className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
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

          <Button size="lg"
            onClick={handleRun}
            disabled={!keywords.trim() || trigger.isPending}
           
          >
            {trigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Scraper
          </Button>
        </div>
      )}

      {/* Run history */}
      <div className="space-y-4">
        {/* Section header + filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-body-lg font-semibold text-on-surface">Recent Runs</h2>
            {total > 0 && (
              <span className="text-label text-on-surface-variant">({total} total)</span>
            )}
            {activeFilterCount > 0 && (
              <span className="bg-primary text-on-primary text-caption font-semibold px-1.5 py-0.5 rounded-full">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Source filter */}
            <div className="relative">
              <select
                value={filterSource}
                onChange={(e) => { setFilterSource(e.target.value as ScrapeSource | ""); setPage(0); }}
                className="appearance-none text-label bg-surface-container border border-outline-variant rounded-lg pl-3 pr-7 py-1.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as ScrapeRunStatus | ""); setPage(0); }}
                className="appearance-none text-label bg-surface-container border border-outline-variant rounded-lg pl-3 pr-7 py-1.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterSource(""); setFilterStatus(""); setPage(0); }}
                className="flex items-center gap-1 text-label text-error hover:underline"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Run list */}
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : runs.length === 0 ? (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-8 text-center">
            <Users className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
            {activeFilterCount > 0 ? (
              <>
                <p className="text-body-lg text-on-surface-variant">No runs match the current filters.</p>
                <button
                  onClick={() => { setFilterSource(""); setFilterStatus(""); setPage(0); }}
                  className="mt-2 text-label text-primary hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-body-lg text-on-surface-variant">No scraper runs yet.</p>
                <p className="text-label text-on-surface-variant mt-1">Pick a scraper above and click Run to find leads.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} onDuplicate={handleDuplicate} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-label text-on-surface-variant">
              Page {page + 1} of {totalPages} · {total} runs
            </span>
            <div className="flex items-center gap-1">
              <IconButton size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border border-outline-variant" aria-label="Previous page">
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 text-label rounded-lg transition-colors ${
                      pageNum === page
                        ? "bg-primary text-on-primary font-semibold"
                        : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <IconButton size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="border border-outline-variant" aria-label="Next page">
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
