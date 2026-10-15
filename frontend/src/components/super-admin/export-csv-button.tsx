"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSAExportCsv } from "@/hooks/use-super-admin";
import type { CsvDownload, SAExportList } from "@/lib/api/super-admin";

function saveFile({ blob, filename }: CsvDownload) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before freeing the blob
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface ExportCsvButtonProps {
  list: SAExportList;
  /** The list's current filters and sort; page/limit are dropped */
  params: Record<string, unknown>;
  className?: string;
}

/** Downloads the list as CSV with the filters and sort currently applied. */
export function ExportCsvButton({ list, params, className }: ExportCsvButtonProps) {
  const exportCsv = useSAExportCsv();

  const run = () =>
    exportCsv.mutate(
      { list, params },
      {
        onSuccess: (file) => {
          saveFile(file);
          if (file.truncated) {
            toast.warning("Only the first 10,000 rows were exported. Narrow the filters to export the rest.");
          } else {
            toast.success(`Exported ${file.filename}`);
          }
        },
        onError: () => toast.error("Could not export. Please try again."),
      },
    );

  return (
    <Button type="button" variant="secondary" onClick={run} loading={exportCsv.isPending} className={className}>
      {!exportCsv.isPending && <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
      {exportCsv.isPending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
