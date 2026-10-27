"use client";

import { ShieldCheck, Download, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useQuery } from "@tanstack/react-query";
import { listDataRequests, type DataRequest } from "@/lib/api/gdpr";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageHeader } from "@/components/layout/page-header";

const columns: DataTableColumn<DataRequest>[] = [
  {
    id: "contact",
    header: "Contact",
    cell: (req) => (
      <div className="min-w-0">
        <p className="text-body font-medium text-on-surface">{req.contact.name || "Unknown"}</p>
        <p className="text-caption text-on-surface-variant/60">{req.contact.phoneNumber}</p>
      </div>
    ),
  },
  {
    id: "type",
    header: "Type",
    skeleton: "badge",
    cell: (req) => (
      <Badge variant={req.requestType === "export" ? "info" : "error"}>
        {req.requestType === "export" ? (
          <><Download className="h-3 w-3 mr-0.5" />Export</>
        ) : (
          <><Trash2 className="h-3 w-3 mr-0.5" />Erasure</>
        )}
      </Badge>
    ),
  },
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cell: (req) => (
      <Badge variant={req.status === "completed" ? "success" : req.status === "failed" ? "error" : "warning"}>
        {req.status}
      </Badge>
    ),
  },
  {
    id: "requested",
    header: "Requested",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (req) => new Date(req.createdAt).toLocaleString(),
  },
  {
    id: "completed",
    header: "Completed",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (req) => (req.completedAt ? new Date(req.completedAt).toLocaleString() : "—"),
  },
];

export default function GdprPage() {
  usePageTitle("GDPR & data privacy");

  const { data, isLoading } = useQuery({
    queryKey: ["gdpr", "requests"],
    queryFn: () => listDataRequests(),
  });

  return (
    <div className="space-y-5 p-6 max-lg:space-y-4 max-lg:p-4">
      <PageHeader className="max-lg:hidden" title="GDPR & data privacy" count={data?.data.length} />

      {/* Info cards (desktop: numbers only; phones keep the coloured icons in one grouped list) */}
      {/* Phones: one grouped list, label left and count right */}
      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-xl max-sm:border max-sm:border-outline-variant/15 max-sm:[&>div]:flex max-sm:[&>div]:items-center max-sm:[&>div]:justify-between max-sm:[&>div]:rounded-none max-sm:[&>div]:border-x-0 max-sm:[&>div]:border-t-0 max-sm:[&>div]:py-3 max-sm:[&>div:last-child]:border-b-0 max-sm:[&>div>div]:mb-0 max-sm:[&>div>p]:text-title">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 mb-1">
            <Download className="h-4 w-4 text-info lg:hidden" />
            <p className="text-label text-on-surface-variant">Data exports</p>
          </div>
          <p className="text-headline font-semibold tabular-nums text-on-surface">
            {data?.data.filter((r) => r.requestType === "export").length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="h-4 w-4 text-error lg:hidden" />
            <p className="text-label text-on-surface-variant">Data erasures</p>
          </div>
          <p className="text-headline font-semibold tabular-nums text-on-surface">
            {data?.data.filter((r) => r.requestType === "erasure").length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-warning lg:hidden" />
            <p className="text-label text-on-surface-variant">Pending</p>
          </div>
          <p className="text-headline font-semibold tabular-nums text-on-surface">
            {data?.data.filter((r) => r.status === "pending").length ?? 0}
          </p>
        </div>
      </div>

      {/* Requests table */}
      <DataTable
        label="Data requests"
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(req) => req.id}
        rowLabel={(req) => req.contact.name || req.contact.phoneNumber}
        loading={isLoading}
        skeletonRows={6}
        empty={{
          icon: <ShieldCheck className="h-12 w-12" />,
          title: "No data requests",
          description: "Data export and erasure requests will appear here when initiated from the Contacts module.",
        }}
      />
    </div>
  );
}
