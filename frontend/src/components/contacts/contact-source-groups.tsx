"use client";

import { useRouter } from "next/navigation";
import { Megaphone, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useContactGroups } from "@/hooks/use-contacts";
import { useContactsStore } from "@/stores/contacts-store";
import { CONTACT_SOURCE_LABELS, SCRAPE_SOURCE_LABELS } from "@/lib/constants/contact-sources";

function GroupChip({
  active, label, count, onClick, title,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 max-w-64 rounded-full border px-3 py-1 text-label transition-colors",
        active
          ? "border-primary/30 bg-primary/15 text-primary"
          : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container",
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn("tabular-nums", active ? "text-primary/80" : "text-on-surface-variant/50")}>
        {count}
      </span>
    </button>
  );
}

/**
 * Contacts grouped by how they came in (source, and the exact scrape run for
 * scraped leads). Picking a group filters the list and offers a campaign to it.
 */
export function ContactSourceGroups() {
  const router = useRouter();
  const { data } = useContactGroups();
  const { filterSource, filterScrapeRunId, setFilterSource, setFilterScrapeRunId } = useContactsStore();

  if (!data || data.sources.length === 0) return null;

  const total = data.sources.reduce((sum, g) => sum + g.count, 0);
  const activeRun = data.scrapeRuns.find((r) => r.id === filterScrapeRunId);
  const activeCount = activeRun
    ? activeRun.count
    : data.sources.find((g) => g.source === filterSource)?.count ?? 0;
  const activeLabel = activeRun
    ? `"${activeRun.keywords}"`
    : filterSource && CONTACT_SOURCE_LABELS[filterSource];

  function runCampaign() {
    const params = new URLSearchParams({ action: "new" });
    if (filterScrapeRunId) params.set("scrapeRunId", filterScrapeRunId);
    else if (filterSource) params.set("source", filterSource);
    router.push(`/campaigns?${params}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <GroupChip
          active={!filterSource}
          label="All sources"
          count={total}
          onClick={() => setFilterSource(null)}
        />
        {data.sources.map((g) => (
          <GroupChip
            key={g.source}
            active={filterSource === g.source && !filterScrapeRunId}
            label={CONTACT_SOURCE_LABELS[g.source] ?? g.source}
            count={g.count}
            onClick={() => setFilterSource(g.source)}
          />
        ))}

        {filterSource && activeCount > 0 && (
          <Button size="sm" onClick={runCampaign} className="ml-auto">
            <Megaphone className="h-3.5 w-3.5 mr-1" />
            Campaign to {activeLabel} · {activeCount}
          </Button>
        )}
      </div>

      {/* Scraped leads, one group per scrape run */}
      {filterSource === "WEB_SCRAPE" && data.scrapeRuns.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-3 border-l-2 border-outline-variant/20">
          <ScanSearch className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
          {data.scrapeRuns.map((r) => (
            <GroupChip
              key={r.id}
              active={filterScrapeRunId === r.id}
              label={`${SCRAPE_SOURCE_LABELS[r.source] ?? r.source} · ${r.keywords}${r.location ? ` · ${r.location}` : ""}`}
              title={`Scraped ${new Date(r.createdAt).toLocaleDateString()}`}
              count={r.count}
              onClick={() => setFilterScrapeRunId(filterScrapeRunId === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
