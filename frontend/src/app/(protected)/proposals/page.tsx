"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProposals } from "@/hooks/use-proposals";
import type { ProposalListItem, ProposalStatus } from "@/lib/api/proposals";
import { money } from "@/components/proposals/proposal-document";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Tabs } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

const FILTERS: { id: ProposalStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Drafts" },
  { id: "SENT", label: "Sent" },
  { id: "VIEWED", label: "Viewed" },
  { id: "CHANGES_REQUESTED", label: "Changes" },
  { id: "ACCEPTED", label: "Accepted" },
];

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const isExpired = (p: ProposalListItem) =>
  !!p.validUntil && new Date(p.validUntil) < new Date() && (p.status === "SENT" || p.status === "VIEWED");

const columns: DataTableColumn<ProposalListItem>[] = [
  {
    id: "proposal",
    header: "Proposal",
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate text-body font-medium text-on-surface">{p.title}</p>
        <p className="truncate text-caption text-on-surface-variant">
          {p.number} · {p.contact.name || p.contact.phoneNumber}
          {p.deal ? ` · ${p.deal.title}` : ""}
        </p>
      </div>
    ),
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    className: "w-32",
    skeleton: "short",
    cellClassName: "text-body tabular-nums text-on-surface",
    cell: (p) => money(p.total, p.currency),
  },
  {
    id: "status",
    header: "Status",
    className: "w-36",
    skeleton: "badge",
    cell: (p) => <ProposalStatusBadge status={p.status} expired={isExpired(p)} />,
  },
  {
    id: "updated",
    header: "Updated",
    align: "right",
    className: "w-24",
    skeleton: "short",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (p) => ago(p.updatedAt),
  },
];

export default function ProposalsPage() {
  usePageTitle("Proposals");
  const router = useRouter();
  const [status, setStatus] = useState<ProposalStatus | undefined>();
  const { data, isLoading } = useProposals(status ? { status } : undefined);

  return (
    <div className="space-y-4 p-4 md:p-6 max-lg:pt-2">
      {/* Title: the iOS nav bar shows it on mobile */}
      <PageHeader className="max-lg:hidden" title="Proposals" count={data?.length} />

      <FilterBar className="mobile-scroll-x">
        <Tabs
          tabs={FILTERS}
          activeTab={status ?? "ALL"}
          onTabChange={(id) => setStatus(id === "ALL" ? undefined : (id as ProposalStatus))}
        />
      </FilterBar>

      <DataTable
        label="Proposals"
        columns={columns}
        rows={data ?? []}
        rowKey={(p) => p.id}
        rowLabel={(p) => p.title}
        loading={isLoading}
        skeletonRows={6}
        onRowClick={(p) => router.push(`/proposals/${p.id}`)}
        empty={{
          icon: <FileText className="h-12 w-12" />,
          title: status ? "No proposals here." : "No proposals yet.",
          description: "Open a chat or a deal and click “Send proposal”.",
        }}
        // Phones: iOS grouped list, one row per proposal
        renderMobileRow={(p) => (
          <Link
            href={`/proposals/${p.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 outline-none active:bg-surface-container"
          >
            <div className="min-w-0 basis-full">
              <p className="truncate text-body font-medium text-on-surface">{p.title}</p>
              <p className="truncate text-label text-on-surface-variant">
                {p.number} · {p.contact.name || p.contact.phoneNumber}
                {p.deal ? ` · ${p.deal.title}` : ""}
              </p>
            </div>
            <span className="text-body tabular-nums text-on-surface">{money(p.total, p.currency)}</span>
            <ProposalStatusBadge status={p.status} expired={isExpired(p)} />
            <span className="ml-auto text-label text-on-surface-variant">{ago(p.updatedAt)}</span>
          </Link>
        )}
      />
    </div>
  );
}
