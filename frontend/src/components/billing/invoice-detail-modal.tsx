"use client";

import { useRef, useState } from "react";
import {
  X,
  Download,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Invoice } from "@/lib/types/billing";
import type { AuthUser } from "@/lib/types/auth";

interface Props {
  invoice: Invoice;
  user: AuthUser | null;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(cents: number, currency: string) {
  const symbol = currency?.toUpperCase() === "INR" ? "₹" : "$";
  return `${symbol}${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    PAID:          { label: "Paid",          cls: "bg-success/10 text-success",                   icon: <CheckCircle className="h-3.5 w-3.5" /> },
    OPEN:          { label: "Open",          cls: "bg-warning/10 text-warning",                   icon: <Clock className="h-3.5 w-3.5" /> },
    DRAFT:         { label: "Draft",         cls: "bg-surface-container text-on-surface-variant", icon: <FileText className="h-3.5 w-3.5" /> },
    VOID:          { label: "Void",          cls: "bg-surface-container text-on-surface-variant", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    UNCOLLECTIBLE: { label: "Uncollectible", cls: "bg-error/10 text-error",                      icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const m = map[status] ?? { label: status, cls: "bg-surface-container text-on-surface-variant", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ─── PDF Download via jsPDF + html2canvas ────────────────────────────────────

async function downloadAsPdf(element: HTMLElement, filename: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  // Render inside a hidden iframe that has NO Tailwind stylesheet.
  // This prevents html2canvas from ever seeing lab()/oklch() color functions
  // from Tailwind v4's CSS custom properties.
  // Mount a hidden iframe with NO Tailwind/app stylesheets — only safe hex colors.
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:780px;height:1px;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  // Wait for iframe to be ready
  await new Promise((r) => setTimeout(r, 50));

  const iframeDoc = iframe.contentDocument!;
  iframeDoc.head.innerHTML = `<meta charset="UTF-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; width: 780px; }
  </style>`;

  // Clone the invoice element (all inline styles — no Tailwind classes) into the iframe
  const clone = element.cloneNode(true) as HTMLElement;
  iframeDoc.body.appendChild(clone);

  // Let layout settle then expand iframe to full scroll height
  await new Promise((r) => setTimeout(r, 150));
  iframe.style.height = `${iframeDoc.body.scrollHeight}px`;
  await new Promise((r) => setTimeout(r, 50));

  const canvas = await html2canvas(iframeDoc.body, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 780,
    width: 780,
    height: iframeDoc.body.scrollHeight,
  });

  document.body.removeChild(iframe);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // If content taller than one page, split across pages
  let yOffset = 0;
  while (yOffset < imgHeight) {
    if (yOffset > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
    yOffset += pageHeight;
  }

  pdf.save(filename);
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function InvoiceDetailModal({ invoice, user, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const orgName = user ? `${user.firstName} ${user.lastName}` : "Your Organization";
  const orgEmail = user?.email ?? "";
  const lineItems: any[] = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const currSymbol = invoice.currency?.toUpperCase() === "INR" ? "₹" : "$";

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await downloadAsPdf(printRef.current, `${invoice.invoiceNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.outerHTML;
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.head.innerHTML = `<meta charset="UTF-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      @media print { body { margin: 0; } }
    </style>`;
    win.document.body.innerHTML = content;
    setTimeout(() => { win.focus(); win.print(); }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface-container-low border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface">{invoice.invoiceNumber}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Invoice Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-[12px] font-medium text-on-surface-variant"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors text-[12px] font-medium text-on-primary"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? "Generating…" : "Download PDF"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="overflow-y-auto flex-1 bg-surface-container/30 p-6">
          {/* This div is what gets captured for PDF */}
          <div
            ref={printRef}
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#fff" }}
            className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white"
          >
            {/* Gradient header */}
            <div style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
              padding: "36px 40px 28px",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: "rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>💬</div>
                  <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>Wazelo CRM</span>
                </div>
                {/* Invoice number */}
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", opacity: 0.6 }}>Invoice</p>
                  <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-1px", marginTop: 4 }}>{invoice.invoiceNumber}</p>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 14px",
                      borderRadius: 100,
                      fontSize: 11, fontWeight: 700,
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}>{invoice.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #f0f0f0" }}>
              {[
                { label: "Billed To",      primary: orgName,                    secondary: orgEmail },
                { label: "Billing Period", primary: formatDateShort(invoice.periodStart), secondary: `to ${formatDateShort(invoice.periodEnd)}` },
                { label: "Due Date",       primary: formatDate(invoice.dueDate), secondary: invoice.paidAt ? `Paid ${formatDateShort(invoice.paidAt)}` : undefined },
              ].map((col, i) => (
                <div key={i} style={{ padding: "18px 24px", borderRight: i < 2 ? "1px solid #f0f0f0" : undefined }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#9ca3af", marginBottom: 4 }}>{col.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{col.primary}</p>
                  {col.secondary && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{col.secondary}</p>}
                </div>
              ))}
            </div>

            {/* PAID stamp row */}
            {invoice.status === "PAID" && (
              <div style={{ padding: "12px 40px 0", textAlign: "right" }}>
                <span style={{
                  display: "inline-block",
                  border: "3px solid #16a34a",
                  borderRadius: 8,
                  padding: "5px 16px",
                  fontSize: 14, fontWeight: 800,
                  color: "#16a34a",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  transform: "rotate(-6deg)",
                  opacity: 0.85,
                }}>Paid</span>
              </div>
            )}

            {/* Line items */}
            <div style={{ padding: "20px 40px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Description", "Qty", "Unit Price", "Total"].map((h, i) => (
                      <th key={h} style={{
                        padding: "10px 12px",
                        fontSize: 10, fontWeight: 700, letterSpacing: "1px",
                        textTransform: "uppercase", color: "#6b7280",
                        textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length > 0 ? lineItems.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{item.description ?? "—"}</td>
                      <td style={{ padding: "12px", fontSize: 13, color: "#374151", textAlign: "center" }}>{item.quantity ?? 1}</td>
                      <td style={{ padding: "12px", fontSize: 13, color: "#374151", textAlign: "right" }}>
                        {currSymbol}{((item.amount ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#111827", textAlign: "right" }}>
                        {currSymbol}{(((item.amount ?? 0) * (item.quantity ?? 1)) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No line items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ padding: "0 40px 28px", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 220 }}>
                {[
                  { label: "Subtotal", value: formatAmount(invoice.amountInCents, invoice.currency), bold: false },
                  { label: "Tax (0%)",  value: `${currSymbol}0.00`,                                   bold: false },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13, color: "#374151" }}>
                    <span>{row.label}</span><span>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 16, fontWeight: 800, color: "#111827", borderTop: "2px solid #e5e7eb", marginTop: 4 }}>
                  <span>Total</span>
                  <span>{formatAmount(invoice.amountInCents, invoice.currency)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 40px", background: "#f9fafb", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Thank you for your business · Wazelo CRM Platform</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#4338ca" }}>support@wazelo.in</p>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-container-high hover:bg-outline-variant/20 transition-colors text-[13px] font-medium text-on-surface-variant"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 hover:bg-surface-container-high transition-colors text-[13px] font-medium text-on-surface flex items-center justify-center gap-2"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors text-[13px] font-medium text-on-primary flex items-center justify-center gap-2"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {downloading ? "Generating PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
