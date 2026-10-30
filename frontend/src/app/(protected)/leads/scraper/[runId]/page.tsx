"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Loader2,
  Phone, Mail, MapPin, ExternalLink, Star, Import, Users, Download, Send,
  Filter, X, Rocket, Globe, ChevronRight,
} from "lucide-react";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  FilterBar as SharedFilterBar,
  FilterBarDivider,
  FilterSelect as SharedFilterSelect,
} from "@/components/ui/filter-bar";
import { StartOutreachModal } from "@/components/lead-scraper/start-outreach-modal";
import { useScrapeRunResults, useImportScrapeResults, useWhatsAppChecks } from "@/hooks/use-lead-scraper";
import { useQuery } from "@tanstack/react-query";
import { leadScraperApi } from "@/lib/api/lead-scraper";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PitchTemplateModal } from "@/components/lead-scraper/pitch-template-modal";
import { TypeFilter } from "@/components/lead-scraper/type-filter";
import type { CheckWhatsAppResult } from "@/lib/api/lead-scraper";
import type { ScrapeResult, ScrapeRunStatus, ScrapeSource } from "@/lib/types/lead-scraper";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/** Results per page on a run (a run holds up to 200) */
const RESULTS_PAGE_SIZE = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveFilters {
  search: string;
  waStatus: "all" | "active" | "inactive" | "unknown";
  imported: "all" | "yes" | "no";
  hasPhone: "all" | "yes" | "no";
  hasWebsite: "all" | "yes" | "no";
  minRating: number; // 0 = any
  categories: string[]; // empty = all
  tier: "all" | ScoreTier;
  /** new = not in contacts and not found before */
  known: "all" | "new" | "in_contacts" | "seen";
  sortByScore: boolean;
}

const DEFAULT_FILTERS: ActiveFilters = {
  search: "",
  waStatus: "all",
  imported: "all",
  hasPhone: "all",
  hasWebsite: "all",
  minRating: 0,
  categories: [],
  tier: "all",
  known: "all",
  sortByScore: false,
};

// ─── Lead score ───────────────────────────────────────────────────────────────

type ScoreTier = "hot" | "warm" | "cold";

function scoreTier(score: number): ScoreTier {
  if (score >= 7) return "hot";
  if (score >= 4) return "warm";
  return "cold";
}

const TIER_STYLE: Record<ScoreTier, { label: string; className: string }> = {
  hot:  { label: "Hot",  className: "bg-error/10 text-error" },
  warm: { label: "Warm", className: "bg-warning/10 text-warning" },
  cold: { label: "Cold", className: "bg-surface-container text-on-surface-variant" },
};

function ScoreBadge({ score }: { score: number }) {
  const { label, className } = TIER_STYLE[scoreTier(score)];
  return (
    <span
      title={`Lead score ${score}/10`}
      className={`shrink-0 text-caption font-semibold px-1.5 py-0.5 rounded-full ${className}`}
    >
      {label} · {score}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<ScrapeSource, string> = {
  GOOGLE_MAPS: "Google Maps",
  UPWORK_JOBS: "Upwork Jobs",
  FREELANCER_IN: "Freelancer.in",
  TRUELANCER: "Truelancer",
  LINKEDIN_JOBS: "LinkedIn Jobs",
};

function StatusBadge({ status }: { status: ScrapeRunStatus }) {
  const config: Record<ScrapeRunStatus, { label: string; variant: "muted" | "primary" | "success" | "error" }> = {
    PENDING:   { label: "Pending",   variant: "muted" },
    RUNNING:   { label: "Running",   variant: "primary" },
    COMPLETED: { label: "Done",      variant: "success" },
    FAILED:    { label: "Failed",    variant: "error" },
    CANCELLED: { label: "Cancelled", variant: "muted" },
  };
  const { label, variant } = config[status];
  return (
    <Badge variant={variant} dot pulse={status === "RUNNING"}>
      {label}
    </Badge>
  );
}

function WaBadge({ status }: { status: CheckWhatsAppResult | undefined }) {
  if (!status) return null;
  if (status.exists === true) return <Badge variant="success" dot>WA active</Badge>;
  if (status.exists === false) return <Badge variant="error" dot>Not on WA</Badge>;
  return <Badge variant="muted" dot>Unknown</Badge>;
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <SharedFilterSelect
      label={label}
      // The first option is each filter's "all" value
      active={value !== options[0]?.value}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </SharedFilterSelect>
  );
}

function FilterBar({
  filters,
  onChange,
  categories,
  waChecksLoaded,
  hasScores,
  resultCount,
  visibleCount,
}: {
  filters: ActiveFilters;
  onChange: (f: Partial<ActiveFilters>) => void;
  categories: { name: string; count: number }[];
  waChecksLoaded: boolean;
  hasScores: boolean;
  resultCount: number;
  visibleCount: number;
}) {
  const activeCount = [
    filters.search !== "",
    filters.waStatus !== "all",
    filters.imported !== "all",
    filters.hasPhone !== "all",
    filters.hasWebsite !== "all",
    filters.minRating > 0,
    filters.categories.length > 0,
    filters.tier !== "all",
    filters.known !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Top row: search + count */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search name, company, category, skills"
          aria-label="Search results"
          className="flex-1 min-w-[200px] max-w-md max-lg:max-w-none max-lg:min-w-0 max-lg:basis-full max-lg:order-last h-8 max-lg:h-10 max-lg:rounded-xltext-label bg-surface-container-lowest border border-outline-variant rounded-lg px-3 text-on-surface placeholder:text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />

        {/* Showing count */}
        <span className="text-label tabular-nums text-on-surface-variant ml-auto shrink-0">
          {visibleCount} of {resultCount}
        </span>

        {/* Clear all */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 rounded-md px-1 text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus shrink-0"
          >
            <X className="w-3 h-3" /> Clear {activeCount}
          </button>
        )}
      </div>

      {/* Every filter on one row */}
      <SharedFilterBar className="mobile-scroll-x">
        {/* Lead score */}
        {hasScores && (
          <>
            <FilterSelect
              label="Score"
              value={filters.tier}
              onChange={(v) => onChange({ tier: v as ActiveFilters["tier"] })}
              options={[
                { value: "all", label: "Score: All" },
                { value: "hot", label: "Hot (7+)" },
                { value: "warm", label: "Warm (4–6)" },
                { value: "cold", label: "Cold (0–3)" },
              ]}
            />
            <button
              type="button"
              onClick={() => onChange({ sortByScore: !filters.sortByScore })}
              aria-pressed={filters.sortByScore}
              // Same chip as the shared Tabs/FilterSelect: filled when on
              className={`h-8 shrink-0 rounded-full border px-3 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                filters.sortByScore
                  ? "border-transparent bg-on-surface text-surface"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-outline hover:text-on-surface"
              }`}
            >
              Best leads first
            </button>
            <FilterBarDivider />
          </>
        )}

        {/* New vs already known */}
        <FilterSelect
          label="Lead"
          value={filters.known}
          onChange={(v) => onChange({ known: v as ActiveFilters["known"] })}
          options={[
            { value: "all", label: "Leads: All" },
            { value: "new", label: "New only" },
            { value: "in_contacts", label: "Already in contacts" },
            { value: "seen", label: "Found before" },
          ]}
        />

        {/* WA Status */}
        <FilterSelect
          label="WA Status"
          value={filters.waStatus}
          onChange={(v) => onChange({ waStatus: v as ActiveFilters["waStatus"] })}
          options={[
            { value: "all", label: "WA: All" },
            { value: "active", label: "WA: Active" },
            { value: "inactive", label: "WA: Not on WA" },
            { value: "unknown", label: "WA: Unknown" },
          ]}
        />

        {/* Imported */}
        <FilterSelect
          label="Imported"
          value={filters.imported}
          onChange={(v) => onChange({ imported: v as ActiveFilters["imported"] })}
          options={[
            { value: "all", label: "Imported: All" },
            { value: "no", label: "Not imported" },
            { value: "yes", label: "Imported" },
          ]}
        />

        {/* Has phone */}
        <FilterSelect
          label="Phone"
          value={filters.hasPhone}
          onChange={(v) => onChange({ hasPhone: v as ActiveFilters["hasPhone"] })}
          options={[
            { value: "all", label: "Phone: All" },
            { value: "yes", label: "Has phone" },
            { value: "no", label: "No phone" },
          ]}
        />

        {/* Has website */}
        <FilterSelect
          label="Website"
          value={filters.hasWebsite}
          onChange={(v) => onChange({ hasWebsite: v as ActiveFilters["hasWebsite"] })}
          options={[
            { value: "all", label: "Website: All" },
            { value: "yes", label: "Has website" },
            { value: "no", label: "No website" },
          ]}
        />

        {/* Min rating */}
        <FilterSelect
          label="Rating"
          value={String(filters.minRating)}
          onChange={(v) => onChange({ minRating: Number(v) })}
          options={[
            { value: "0", label: "Rating: Any" },
            { value: "3", label: "Rating 3.0+" },
            { value: "3.5", label: "Rating 3.5+" },
            { value: "4", label: "Rating 4.0+" },
            { value: "4.5", label: "Rating 4.5+" },
          ]}
        />

        {/* Type — dynamic from data */}
        {categories.length > 0 && (
          <TypeFilter
            options={categories}
            value={filters.categories}
            onChange={(cats) => onChange({ categories: cats })}
          />
        )}

        {/* Quick: Select all WA active */}
        {waChecksLoaded && (
          <span className="ml-auto text-caption text-on-surface-variant">
            Quick:
            <button
              type="button"
              onClick={() => onChange({ waStatus: "active", imported: "no", hasPhone: "yes" })}
              className="ml-1.5 rounded text-primary hover:underline font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              WA active, not imported
            </button>
          </span>
        )}
      </SharedFilterBar>
    </div>
  );
}

// ─── Result table row ─────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Extra facts from the source page, only the ones it showed */
function detailLines(result: ScrapeResult): [string, string][] {
  const d = result.details;
  if (!d) return [];
  const lines: [string, string][] = [];
  if (d.postedAt) lines.push(["Posted", timeAgo(d.postedAt)]);
  if (d.budgetType) lines.push(["Type", d.budgetType === "hourly" ? "Hourly" : "Fixed price"]);
  if (d.proposals != null) lines.push(["Proposals", String(d.proposals)]);
  if (d.paymentVerified != null) lines.push(["Payment", d.paymentVerified ? "Verified" : "Not verified"]);
  if (d.clientCountry && d.clientCountry !== result.location) lines.push(["Client", d.clientCountry]);
  if (d.priceLevel) lines.push(["Price", "₹".repeat(d.priceLevel)]);
  if (d.photoCount != null) lines.push(["Photos", String(d.photoCount)]);
  if (d.lastReviewAt) lines.push(["Last review", timeAgo(d.lastReviewAt)]);
  return lines;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <span className="truncate text-caption text-on-surface-variant">
      <span className="text-on-surface-variant/60">{label}:</span> {value}
    </span>
  );
}

/** Result table columns; the phone cell needs the WhatsApp check answers */
function resultColumns(waStatusMap: Record<string, CheckWhatsAppResult>): DataTableColumn<ScrapeResult>[] {
  return [
    {
      // Name + category (one block so the mobile card title stacks)
      id: "name",
      header: "Name",
      cell: (result) => (
        <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-body text-on-surface truncate max-w-[200px] max-lg:max-w-none">
            {result.name ?? "—"}
          </p>
          {result.score != null && <ScoreBadge score={result.score} />}
        </div>
        {result.tags?.length > 0 && (
          <p className="text-caption text-on-surface-variant mt-0.5 truncate max-w-[240px] max-lg:max-w-none max-lg:font-normal">
            {result.tags.join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {result.category && (
            <span className="text-caption bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {result.category}
            </span>
          )}
          {result.jobTitle && !result.category && (
            <span className="text-caption bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">
              {result.jobTitle}
            </span>
          )}
          {result.imported && (
            <span className="text-caption bg-success/10 text-success px-1.5 py-0.5 rounded-full">
              Imported
            </span>
          )}
          {!result.imported && result.existingContactId && (
            <Link
              href={`/contacts/${result.existingContactId}`}
              onClick={(e) => e.stopPropagation()}
              title="This number is already saved — open the contact"
              className="text-caption bg-warning/10 text-warning px-1.5 py-0.5 rounded-full hover:underline"
            >
              In contacts
            </Link>
          )}
          {result.seenBeforeAt && (
            <span
              title={`Also found in an earlier run on ${new Date(result.seenBeforeAt).toLocaleDateString()}`}
              className="text-caption bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full"
            >
              Found {timeAgo(result.seenBeforeAt)}
            </span>
          )}
        </div>
        </div>
      ),
    },
    {
      // Phone + WA + Email
      id: "phone",
      header: "Phone",
      cell: (result) => {
        const waStatus = result.phone ? waStatusMap[result.phone] : undefined;
        return result.phone || result.email ? (
          <div className="flex flex-col gap-0.5">
            {result.phone && (
              <>
                <a
                  href={`tel:${result.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-label text-on-surface hover:text-primary whitespace-nowrap"
                >
                  <Phone className="w-3 h-3 shrink-0 text-on-surface-variant" />
                  {result.phone}
                </a>
                <WaBadge status={waStatus} />
              </>
            )}
            {result.email && (
              <a
                href={`mailto:${result.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-label text-on-surface-variant hover:text-primary max-w-[200px]"
              >
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{result.email}</span>
              </a>
            )}
          </div>
        ) : (
          <span className="text-label text-on-surface-variant">—</span>
        );
      },
    },
    {
      id: "address",
      header: "Address",
      cell: (result) =>
        result.address || result.location ? (
          <span className="flex items-start gap-1 text-label text-on-surface-variant max-w-[220px]">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{result.address || result.location}</span>
          </span>
        ) : (
          <span className="text-label text-on-surface-variant">—</span>
        ),
    },
    {
      id: "website",
      header: "Website",
      cell: (result) =>
        result.website ? (
          <a
            href={result.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-label text-primary hover:underline max-w-[140px] truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {result.website.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0]}
          </a>
        ) : (
          <span className="text-label text-on-surface-variant">—</span>
        ),
    },
    {
      id: "rating",
      header: "Rating",
      skeleton: "short",
      cell: (result) =>
        result.rating ? (
          <span className="flex items-center gap-1 text-label whitespace-nowrap">
            <Star className="w-3 h-3 fill-warning text-warning" />
            <span className="font-medium text-on-surface">{result.rating.toFixed(1)}</span>
            {result.reviewCount && (
              <span className="text-on-surface-variant">({result.reviewCount})</span>
            )}
          </span>
        ) : (
          <span className="text-label text-on-surface-variant">—</span>
        ),
    },
    {
      id: "details",
      header: "Details",
      cell: (result) => (
        <div className="flex flex-col gap-1 max-w-[200px]">
          {result.description && (
            <p className="text-caption text-on-surface-variant line-clamp-2">{result.description}</p>
          )}
          {result.openingHours && (
            <DetailLine label="Hours" value={result.openingHours} />
          )}
          {result.email && (
            <DetailLine label="Email" value={result.email} />
          )}
          {result.budget && (
            <DetailLine label="Budget" value={result.budget} />
          )}
          {result.jobTitle && (
            <DetailLine label="Role" value={result.jobTitle} />
          )}
          {result.company && (
            <DetailLine label="Company" value={result.company} />
          )}
          {detailLines(result).map(([label, value]) => (
            <DetailLine key={label} label={label} value={value} />
          ))}
          {result.skills && result.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.skills.slice(0, 3).map((s) => (
                <span key={s} className="text-caption bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">{s}</span>
              ))}
              {result.skills.length > 3 && <span className="text-caption text-on-surface-variant">+{result.skills.length - 3}</span>}
            </div>
          )}
          {result.socialLinks && result.socialLinks.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {result.socialLinks.map((url) => {
                const domain = url.includes("facebook") ? "FB" : url.includes("instagram") ? "IG" : url.includes("linkedin") ? "LI" : url.includes("youtube") ? "YT" : "Link";
                return (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-caption text-primary hover:underline">{domain}</a>
                );
              })}
            </div>
          )}
          {!result.description && !result.openingHours && !result.email &&
           !result.budget && !result.jobTitle && !result.company &&
           (!result.skills || result.skills.length === 0) &&
           (!result.socialLinks || result.socialLinks.length === 0) && (
            <span className="text-label text-on-surface-variant">—</span>
          )}
        </div>
      ),
    },
    {
      id: "source",
      header: "Source",
      skeleton: "short",
      cell: (result) => (
        <a
          href={result.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-label text-primary hover:underline"
        >
          View
        </a>
      ),
    },
  ];
}

// ─── Phone list ───────────────────────────────────────────────────────────────

function WaDot({ status }: { status: CheckWhatsAppResult | undefined }) {
  if (!status) return null;
  const [label, color] =
    status.exists === true ? ["WA active", "bg-success"] : status.exists === false ? ["Not on WA", "bg-error"] : ["WA unknown", "bg-outline"];
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span aria-hidden className={`size-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

/** Compact phone row: name, rating/category, phone + WhatsApp, website mark. Tap opens the details sheet. */
function ResultMobileRow({ result, wa, onOpen }: {
  result: ScrapeResult;
  wa: CheckWhatsAppResult | undefined;
  onOpen: () => void;
}) {
  const kind = result.category ?? result.jobTitle;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${result.name ?? "Lead"} details`}
      className="flex min-h-14 w-full items-center gap-2 py-2.5 pl-1 pr-3 text-left active:bg-surface-container"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body font-medium text-on-surface">{result.name ?? "—"}</span>
          {result.score != null && <ScoreBadge score={result.score} />}
        </span>
        {(result.rating || kind) && (
          <span className="mt-0.5 flex items-center gap-1.5 text-caption text-on-surface-variant">
            {result.rating ? (
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Star className="w-3 h-3 fill-warning text-warning" aria-hidden />
                <span className="font-medium text-on-surface">{result.rating.toFixed(1)}</span>
                {result.reviewCount ? <span>({result.reviewCount})</span> : null}
              </span>
            ) : null}
            {kind && <span className="truncate">{kind}</span>}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-2 overflow-hidden whitespace-nowrap text-caption text-on-surface-variant">
          {result.phone ? (
            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
              <Phone className="w-3 h-3" aria-hidden />
              {result.phone}
            </span>
          ) : (
            <span className="shrink-0">No phone</span>
          )}
          <WaDot status={wa} />
          {result.website && (
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Globe className="w-3 h-3" aria-hidden />
              <span className="sr-only">Has website</span>
            </span>
          )}
          {result.imported ? (
            <span className="shrink-0 text-success">Imported</span>
          ) : result.existingContactId ? (
            <span className="shrink-0 text-warning">In contacts</span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-on-surface-variant/60" aria-hidden />
    </button>
  );
}

/** Every column of the desktop table, stacked, for one result (phones) */
function ResultDetails({ result, columns, isSelected, onToggle }: {
  result: ScrapeResult;
  columns: DataTableColumn<ScrapeResult>[];
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="px-4">
      <dl className="divide-y divide-outline-variant/40">
        {columns.map((col) => (
          <div key={col.id} className="flex gap-3 py-3">
            <dt className="w-20 shrink-0 text-label text-on-surface-variant">{col.header}</dt>
            <dd className="min-w-0 flex-1 [overflow-wrap:anywhere] [&_*]:max-w-none">{col.cell(result, 0)}</dd>
          </div>
        ))}
      </dl>
      <Button variant={isSelected ? "secondary" : "primary"} size="lg" onClick={onToggle} className="mt-3 w-full">
        {isSelected ? "Deselect" : "Select"}
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScrapeRunResultsPage() {
  const { runId } = useParams<{ runId: string }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pitchOpen, setPitchOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [messageChoiceOpen, setMessageChoiceOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  // Phones: the result whose details sheet is open
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Results page (1-based); any filter change goes back to the first page
  const [page, setPage] = useState(1);
  const updateFilters = (patch: Partial<ActiveFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  // Fetch run details
  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["scrape-runs", runId],
    queryFn: () => leadScraperApi.getRun(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const data = query.state.data;
      const active = data?.status === "PENDING" || data?.status === "RUNNING" || data?.waCheck?.state === "running";
      return active ? 5000 : false;
    },
  });

  const waCheckRunning = run?.waCheck?.state === "running";
  const { data: resultsData, isLoading: resultsLoading } = useScrapeRunResults(runId ?? null, waCheckRunning ? 5000 : false);
  const importMutation = useImportScrapeResults(runId ?? "");

  const results = useMemo(() => resultsData?.results ?? [], [resultsData]);
  const {
    statusMap: waStatusMap,
    isChecking: waChecking,
    checkPhones,
    stopChecking,
  } = useWhatsAppChecks(runId, run?.waCheck, results);

  // Derive unique categories (with counts) from results for the Type filter
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((r) => {
      if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    });
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  // Apply all filters
  const filteredResults = useMemo(() => {
    const matched = results.filter((r) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = [r.name, r.company, r.category, r.jobTitle, ...(r.skills ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // WA status
      if (filters.waStatus !== "all" && r.phone) {
        const wa = waStatusMap[r.phone];
        if (filters.waStatus === "active" && wa?.exists !== true) return false;
        if (filters.waStatus === "inactive" && wa?.exists !== false) return false;
        if (filters.waStatus === "unknown" && wa?.exists != null) return false;
      }
      if (filters.waStatus !== "all" && !r.phone) return false;

      // Imported
      if (filters.imported === "yes" && !r.imported) return false;
      if (filters.imported === "no" && r.imported) return false;

      // Has phone
      if (filters.hasPhone === "yes" && !r.phone) return false;
      if (filters.hasPhone === "no" && r.phone) return false;

      // Has website
      if (filters.hasWebsite === "yes" && !r.website) return false;
      if (filters.hasWebsite === "no" && r.website) return false;

      // Min rating
      if (filters.minRating > 0 && (r.rating == null || r.rating < filters.minRating)) return false;

      // Category chips
      if (filters.categories.length > 0 && !filters.categories.includes(r.category ?? "")) return false;

      // New vs already known (imported results count as in contacts)
      const inContacts = r.imported || !!r.existingContactId;
      if (filters.known === "new" && (inContacts || r.seenBeforeAt)) return false;
      if (filters.known === "in_contacts" && !inContacts) return false;
      if (filters.known === "seen" && !r.seenBeforeAt) return false;

      // Lead score tier
      if (filters.tier !== "all" && (r.score == null || scoreTier(r.score) !== filters.tier)) return false;

      return true;
    });
    return filters.sortByScore
      ? [...matched].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      : matched;
  }, [results, filters, waStatusMap]);

  // Shown a page at a time; select-all, import and export still cover every filtered result
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / RESULTS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedResults = filteredResults.slice((currentPage - 1) * RESULTS_PAGE_SIZE, currentPage * RESULTS_PAGE_SIZE);

  const allSelected = filteredResults.length > 0 && filteredResults.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredResults.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Selection is kept after import so the same leads can be pitched next
  const unimportedSelectedIds = results.filter((r) => selected.has(r.id) && !r.imported).map((r) => r.id);

  const handleImport = () => {
    if (unimportedSelectedIds.length === 0) return;
    importMutation.mutate(unimportedSelectedIds);
  };

  if (runLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }

  if (!run) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-body-lg text-on-surface-variant">Run not found.</p>
        <Link href="/leads/scraper" className="text-body-lg text-primary hover:underline mt-2 inline-block">
          ← Back to Lead Scraper
        </Link>
      </div>
    );
  }

  const importedCount = results.filter((r) => r.imported).length;

  const exportCsv = () => {
    // Export currently visible filtered rows
    const rows = filteredResults;
    if (rows.length === 0) return;
    const headers = ["Name", "Category", "Phone", "Email", "Address", "Website", "Rating", "Reviews", "Lead Score", "Tags", "Budget", "Skills", "Job Title", "Company", "Source URL", "Scraped At", "Imported", "WA Active"];
    const csvRows = rows.map((r) => {
      const wa = r.phone ? waStatusMap[r.phone] : undefined;
      const waLabel = wa?.exists === true ? "Yes" : wa?.exists === false ? "No" : "Unknown";
      return [
        r.name ?? "", r.category ?? "", r.phone ?? "", r.email ?? "",
        r.address ?? r.location ?? "", r.website ?? "",
        r.rating != null ? r.rating.toFixed(1) : "",
        r.reviewCount != null ? String(r.reviewCount) : "",
        r.score != null ? String(r.score) : "", (r.tags ?? []).join("; "),
        r.budget ?? "", (r.skills ?? []).join("; "),
        r.jobTitle ?? "", r.company ?? "",
        r.sourceUrl, r.createdAt,
        r.imported ? "Yes" : "No", waLabel,
      ];
    });
    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-${run.source.toLowerCase()}-${run.keywords.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importedSelected = filteredResults.filter((r) => selected.has(r.id) && r.imported && r.phone);

  // Rows still without a WhatsApp answer: the selected rows, or all visible rows
  const waCheckTargets = (selected.size > 0
    ? filteredResults.filter((r) => selected.has(r.id))
    : filteredResults
  )
    .filter((r) => r.phone && r.waExists == null)
    .map((r) => r.id);
  const phoneCount = results.filter((r) => r.phone).length;
  const checkedCount = results.filter((r) => r.phone && r.waCheckedAt).length;

  const columns = resultColumns(waStatusMap);
  const detail = detailId ? results.find((r) => r.id === detailId) : undefined;
  const exportLabel = `Export ${filteredResults.length !== results.length ? `${filteredResults.length} filtered` : "CSV"}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 max-lg:space-y-4">
      {/* Back nav (the iOS nav bar has Back on mobile) */}
      <Link
        href="/leads/scraper"
        className="inline-flex items-center gap-1.5 text-body-lg text-on-surface-variant hover:text-on-surface transition-colors max-lg:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Lead scraper
      </Link>

      {/* Run header */}
      <div className="space-y-3">
        <PageHeader
          title={SOURCE_LABELS[run.source]}
          description={
            <>
              <span className="font-medium text-on-surface">{run.keywords}</span>
              {run.location && <> · {run.location}</>}
            </>
          }
          actions={<StatusBadge status={run.status} />}
        />

        <div data-tour="run-counts" className="flex items-baseline gap-6 text-body text-on-surface-variant max-lg:justify-between max-lg:gap-3">
          <span>
            <span className="font-semibold tabular-nums text-on-surface">{run.resultCount}</span> found
          </span>
          <span>
            <span className="font-semibold tabular-nums text-on-surface">{results.filter((r) => !r.imported).length}</span> not imported
          </span>
          <span>
            <span className="font-semibold tabular-nums text-success">{importedCount}</span> imported
          </span>
        </div>

        {run.status === "FAILED" && run.errorMessage && (
          <p className="text-label text-error bg-error-container rounded-lg px-3 py-2">{run.errorMessage}</p>
        )}
      </div>

      {/* Scraper running state */}
      {(run.status === "RUNNING" || run.status === "PENDING") && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-body-lg font-medium text-on-surface">Scraper is running…</p>
          <p className="text-label text-on-surface-variant mt-1">Results will appear here automatically.</p>
        </div>
      )}

      {run.status === "COMPLETED" && (
        <>
          {resultsLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : results.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-8 text-center">
              <Users className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
              <p className="text-body-lg text-on-surface-variant">No results were found for this search.</p>
            </div>
          ) : (
            <>
              {/* Phones: the toolbar buttons live in the top bar's ⋮ menu */}
              <MobilePageActions
                moreTitle="Results"
                more={[
                  (waChecking || waCheckTargets.length > 0) && {
                    label: waChecking
                      ? `Stop WhatsApp check (${checkedCount}/${phoneCount})`
                      : `Check WhatsApp (${waCheckTargets.length})`,
                    onSelect: () => (waChecking ? stopChecking() : checkPhones(waCheckTargets)),
                  },
                  run.importedCount > 0 && { label: "Message leads", onSelect: () => setMessageChoiceOpen(true) },
                  { label: exportLabel, onSelect: exportCsv },
                  unimportedSelectedIds.length > 0 && {
                    label: `Import ${unimportedSelectedIds.length}`,
                    onSelect: handleImport,
                    disabled: importMutation.isPending,
                  },
                ]}
              />

              {/* Filter bar */}
              <FilterBar
                filters={filters}
                onChange={updateFilters}
                categories={categories}
                waChecksLoaded={!waChecking && Object.keys(waStatusMap).length > 0}
                hasScores={results.some((r) => r.score != null)}
                resultCount={results.length}
                visibleCount={filteredResults.length}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none max-lg:min-h-11">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  <span className="text-body-lg text-on-surface-variant">
                    {allSelected
                      ? `All ${filteredResults.length} visible selected`
                      : selected.size > 0
                      ? `${selected.size} selected`
                      : `Select leads`}
                  </span>
                </label>

                <div data-tour="run-toolbar" className="flex items-center gap-2 flex-wrap max-lg:hidden">
                  {(waChecking || waCheckTargets.length > 0) && (
                    <Button
                      variant="secondary"
                      onClick={() => (waChecking ? stopChecking() : checkPhones(waCheckTargets))}
                      title="Runs in the background, one number at a time, to keep your WhatsApp number safe"
                    >
                      {waChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                      {waChecking
                        ? `Checking ${checkedCount}/${phoneCount} · Stop`
                        : `Check WhatsApp (${waCheckTargets.length})`}
                    </Button>
                  )}

                  {run && run.importedCount > 0 && (
                    <Button onClick={() => setMessageChoiceOpen(true)}>
                      <Send className="w-4 h-4" />
                      Message leads
                    </Button>
                  )}

                  <Button variant="secondary"
                    onClick={exportCsv}
                   
                  >
                    <Download className="w-4 h-4" />
                    {exportLabel}
                  </Button>

                  {unimportedSelectedIds.length > 0 && (
                    <Button variant="secondary"
                      onClick={handleImport}
                      disabled={importMutation.isPending}
                      className="border-primary text-primary hover:bg-primary/5"
                    >
                      {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
                      Import {unimportedSelectedIds.length}
                    </Button>
                  )}
                </div>
              </div>

              {/* Header checkbox and row clicks cover every filtered result, not just this page */}
              <div className="rounded-2xl border border-outline-variant overflow-hidden max-lg:border-0 max-lg:rounded-none">
                <DataTable
                  label="Scrape results"
                  columns={columns}
                  // Phones: compact rows; the checkbox selects, a tap opens the details sheet
                  renderMobileRow={(r) => (
                    <ResultMobileRow
                      result={r}
                      wa={r.phone ? waStatusMap[r.phone] : undefined}
                      onOpen={() => { setDetailId(r.id); setDetailOpen(true); }}
                    />
                  )}
                  mobileListClassName="mx-0 mt-0 mb-3"
                  rows={pagedResults}
                  rowKey={(r) => r.id}
                  rowLabel={(r) => r.name ?? "lead"}
                  // Clicking a row selects it here (it doesn't open anything)
                  rowActionLabel={(r) => `Select ${r.name ?? "lead"}`}
                  // Imported rows stay selectable so they can be pitched
                  onRowClick={(r) => toggleOne(r.id)}
                  rowClassName={() => "cursor-pointer"}
                  selection={{
                    selected,
                    onChange: setSelected,
                    toggleAll,
                    allChecked: allSelected,
                    someChecked: false,
                    toggleAllLabel: "Select all visible",
                  }}
                  pagination={{
                    page: currentPage - 1,
                    pageSize: RESULTS_PAGE_SIZE,
                    total: filteredResults.length,
                    onPageChange: (p) => setPage(p + 1),
                  }}
                  empty={{
                    icon: <Filter className="w-7 h-7" />,
                    title: "No results match the current filters.",
                    actionLabel: "Clear filters",
                    onAction: () => { setFilters(DEFAULT_FILTERS); setPage(1); },
                    compact: true,
                  }}
                />
              </div>

              {/* Phones: bulk actions for the selection, pinned above the tab bar */}
              {selected.size > 0 && (
                <>
                  <div className="lg:hidden h-16" aria-hidden />
                  <div className="lg:hidden fixed inset-x-0 z-30 bottom-[calc(var(--mobile-tabbar-h)+var(--safe-bottom))] px-4 pb-3 pl-[max(16px,var(--safe-left))] pr-[max(16px,var(--safe-right))]">
                    <div className="ios-floating-card flex items-center gap-2 !p-2">
                      <span className="min-w-0 flex-1 truncate pl-2 text-body font-medium tabular-nums text-on-surface">
                        {selected.size} selected
                      </span>
                      {run.importedCount > 0 && (
                        <Button variant="secondary" onClick={() => setMessageChoiceOpen(true)} className="h-11 shrink-0">
                          <Send className="w-4 h-4" />
                          Message
                        </Button>
                      )}
                      {unimportedSelectedIds.length > 0 && (
                        <Button onClick={handleImport} disabled={importMutation.isPending} className="h-11 shrink-0">
                          {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
                          Import {unimportedSelectedIds.length}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              <BottomSheet open={detailOpen && !!detail} onClose={() => setDetailOpen(false)} title={detail?.name ?? "Lead"}>
                {detail && (
                  <ResultDetails
                    result={detail}
                    columns={columns}
                    isSelected={selected.has(detail.id)}
                    onToggle={() => toggleOne(detail.id)}
                  />
                )}
              </BottomSheet>
            </>
          )}
        </>
      )}

      {/* One entry point for messaging leads: sequence for the run, or a one-time pitch */}
      <Modal
        open={messageChoiceOpen}
        onClose={() => setMessageChoiceOpen(false)}
        aria-labelledby="message-leads-title"
        className="max-w-md p-6"
      >
        {() => (
          <>
            <h2 id="message-leads-title" className="text-title font-semibold text-on-surface mb-4">
              Message leads
            </h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setMessageChoiceOpen(false); setOutreachOpen(true); }}
                className="w-full flex items-start gap-3 rounded-xl border border-outline-variant p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Rocket className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>
                  <span className="block text-body-lg font-medium text-on-surface">
                    Follow-up sequence <span className="text-label text-primary">(recommended)</span>
                  </span>
                  <span className="block text-label text-on-surface-variant mt-0.5">
                    First message plus automatic follow-ups to all {run.importedCount} imported leads. Stops when they reply.
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={importedSelected.length === 0}
                onClick={() => { setMessageChoiceOpen(false); setPitchOpen(true); }}
                className="w-full flex items-start gap-3 rounded-xl border border-outline-variant p-4 text-left enabled:hover:border-primary enabled:hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>
                  <span className="block text-body-lg font-medium text-on-surface">One-time message</span>
                  <span className="block text-label text-on-surface-variant mt-0.5">
                    {importedSelected.length > 0
                      ? `Send one pitch to the ${importedSelected.length} selected imported lead${importedSelected.length !== 1 ? "s" : ""}.`
                      : "Select imported leads in the table first."}
                  </span>
                </span>
              </button>
            </div>
          </>
        )}
      </Modal>

      {run && (
        <StartOutreachModal
          open={outreachOpen}
          onClose={() => setOutreachOpen(false)}
          run={{ id: run.id, keywords: run.keywords, location: run.location, importedCount: run.importedCount }}
        />
      )}

      <PitchTemplateModal
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        selectedResults={results.filter((r) => selected.has(r.id) && r.imported && r.phone)}
      />
    </div>
  );
}
