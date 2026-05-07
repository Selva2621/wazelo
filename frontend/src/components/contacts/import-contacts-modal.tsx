"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useImportContacts } from "@/hooks/use-contacts";

interface ImportContactsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportContactsModal({ open, onClose }: ImportContactsModalProps) {
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportContacts();

  const downloadSample = () => {
    const csv = [
      "Phone,Name,Email,Status,Source",
      "+919876543210,Ravi Kumar,ravi@example.com,NEW,WHATSAPP",
      "+919123456789,Priya Sharma,priya@example.com,INTERESTED,INSTAGRAM",
      "+917654321098,Arjun Patel,,CONTACTED,MANUAL",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);

      // Parse first 5 rows for preview
      const lines = text.split("\n").filter((l) => l.trim());
      const rows = lines.slice(0, 6).map((line) => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
          else { current += ch; }
        }
        result.push(current.trim());
        return result;
      });
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    if (!csvContent) return;
    importMutation.mutate(csvContent, {
      onSuccess: () => {
        // Keep modal open to show results
      },
    });
  };

  const handleClose = () => {
    setCsvContent("");
    setFileName("");
    setPreview([]);
    importMutation.reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-[16px] font-semibold text-on-surface">
              Import Contacts
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Results */}
          {importMutation.isSuccess && (
            <Alert variant="success">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Import complete
                </p>
                <p className="text-[12px]">
                  {importMutation.data.imported} imported, {importMutation.data.skipped} skipped
                  {importMutation.data.errors.length > 0 &&
                    `, ${importMutation.data.errors.length} errors`}
                </p>
                {importMutation.data.errors.length > 0 && (
                  <ul className="text-[11px] mt-1 space-y-0.5 opacity-80">
                    {importMutation.data.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Alert>
          )}

          {importMutation.isError && (
            <Alert variant="error">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {(importMutation.error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || "Import failed"}
              </span>
            </Alert>
          )}

          {/* File Upload */}
          {!importMutation.isSuccess && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-primary/60 bg-primary/10" : "border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5"}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="hidden"
                />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-[13px] font-medium text-on-surface">
                      {fileName}
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-on-surface-variant/30 mx-auto mb-2" />
                    <p className="text-[13px] text-on-surface-variant">
                      Click to select a CSV file or drag & drop
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50 mt-1">
                      Required column: Phone. Optional: Name, Email, Status, Source
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadSample(); }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      Download sample file
                    </button>
                  </>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide mb-2">
                    Preview (first {Math.min(preview.length - 1, 5)} rows)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-outline-variant/10">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                          {preview[0]?.map((h, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left text-[10px] font-semibold text-on-surface-variant uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, ri) => (
                          <tr
                            key={ri}
                            className="border-b border-outline-variant/5"
                          >
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="px-3 py-1.5 text-on-surface-variant truncate max-w-[150px]"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
          <Button variant="ghost" onClick={handleClose}>
            {importMutation.isSuccess ? "Close" : "Cancel"}
          </Button>
          {!importMutation.isSuccess && (
            <Button
              onClick={handleImport}
              disabled={!csvContent || importMutation.isPending}
              loading={importMutation.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import {preview.length > 1 ? `${preview.length - 1} contacts` : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
