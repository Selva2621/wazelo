"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProposals } from "@/hooks/use-proposals";
import type { ProposalStatus } from "@/lib/api/proposals";
import { money } from "@/components/proposals/proposal-document";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { cn } from "@/lib/utils";

const FILTERS: { value: ProposalStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "CHANGES_REQUESTED", label: "Changes" },
  { value: "ACCEPTED", label: "Accepted" },
];

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function ProposalsPage() {
  usePageTitle("Proposals");
  const [status, setStatus] = useState<ProposalStatus | undefined>();
  const { data, isLoading } = useProposals(status ? { status } : undefined);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6 max-lg:space-y-4 max-lg:pt-2">
      {/* Title: the iOS nav bar shows it on mobile */}
      <PageHeader className="max-lg:hidden" title="Proposals" count={data?.length} />

      <FilterBar className="mobile-scroll-x">
        <div role="tablist" aria-label="Filter by status" className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 max-lg:py-1.5 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                status === f.value
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FilterBar>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary" /></div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-outline-variant px-6 py-14 text-center">
          <FileText className="mx-auto h-8 w-8 text-on-surface-variant" aria-hidden />
          <p className="mt-3 text-body text-on-surface">{status ? "No proposals here." : "No proposals yet."}</p>
          <p className="text-label text-on-surface-variant">Open a chat or a deal and click &ldquo;Send proposal&rdquo;.</p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/proposals/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 max-lg:gap-x-3 outline-none hover:bg-surface-container-low focus-visible:bg-surface-container-low">
                <div className="min-w-0 flex-1 max-lg:basis-full">
                  <p className="truncate text-body font-medium text-on-surface">{p.title}</p>
                  <p className="truncate text-label text-on-surface-variant">
                    {p.number} · {p.contact.name || p.contact.phoneNumber}
                    {p.deal ? ` · ${p.deal.title}` : ""}
                  </p>
                </div>
                <span className="text-body tabular-nums text-on-surface">{money(p.total, p.currency)}</span>
                <ProposalStatusBadge status={p.status} expired={!!p.validUntil && new Date(p.validUntil) < new Date() && (p.status === "SENT" || p.status === "VIEWED")} />
                <span className="w-16 text-right text-label text-on-surface-variant max-lg:ml-auto">{ago(p.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
