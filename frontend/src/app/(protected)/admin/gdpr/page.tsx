"use client";

import { ShieldCheck, Download, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { listDataRequests } from "@/lib/api/gdpr";
import { usePageTitle } from "@/hooks/use-page-title";

export default function GdprPage() {
  usePageTitle("GDPR & Data Privacy");

  const { data, isLoading } = useQuery({
    queryKey: ["gdpr", "requests"],
    queryFn: () => listDataRequests(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          GDPR & Data Privacy
        </h1>
        <p className="text-[13px] text-on-surface-variant mt-0.5">
          Track data export and erasure requests for GDPR compliance
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <div className="flex items-center gap-2 mb-1">
            <Download className="h-4 w-4 text-info" />
            <p className="text-[12px] font-medium text-on-surface-variant">Data Exports</p>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {data?.data.filter((r) => r.requestType === "export").length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="h-4 w-4 text-error" />
            <p className="text-[12px] font-medium text-on-surface-variant">Data Erasures</p>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {data?.data.filter((r) => r.requestType === "erasure").length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-warning" />
            <p className="text-[12px] font-medium text-on-surface-variant">Pending</p>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {data?.data.filter((r) => r.status === "pending").length ?? 0}
          </p>
        </div>
      </div>

      {/* Requests table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary" /></div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<ShieldCheck className="h-12 w-12" />}
          title="No data requests"
          description="Data export and erasure requests will appear here when initiated from the Contacts module."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Completed</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {data.data.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-on-surface">{req.contact.name || "Unknown"}</p>
                    <p className="text-[11px] text-on-surface-variant/60">{req.contact.phoneNumber}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={req.requestType === "export" ? "info" : "error"}>
                    {req.requestType === "export" ? (
                      <><Download className="h-3 w-3 mr-0.5" />Export</>
                    ) : (
                      <><Trash2 className="h-3 w-3 mr-0.5" />Erasure</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === "completed" ? "success" : req.status === "failed" ? "error" : "warning"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[11px] text-on-surface-variant">
                  {new Date(req.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-[11px] text-on-surface-variant">
                  {req.completedAt ? new Date(req.completedAt).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
