"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CreditCard, Download, FileText } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tabs, tabPanelProps } from "@/components/ui/tabs";
import { PaymentDetailModal } from "@/components/billing/payment-detail-modal";
import { InvoiceDetailModal } from "@/components/billing/invoice-detail-modal";
import { useInvoice, useInvoices, usePayment, usePayments } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { PAGE_SIZE } from "@/lib/constants";
import type { Invoice, Payment } from "@/lib/types/billing";
import { cn, formatMoney } from "@/lib/utils";
import { billingCard, formatBillingDate, InvoiceStatusBadge, PaymentStatusBadge } from "./billing-format";

const linkButton =
  "inline-flex items-center gap-1.5 rounded text-label font-medium text-primary hover:underline outline-none focus-visible:ring-2 focus-visible:ring-focus";

function amount(cents: number, currency: string) {
  return (
    <>
      {formatMoney(cents, currency)} <span className="text-caption font-normal text-on-surface-variant">{currency}</span>
    </>
  );
}

function paymentColumns(onOpen: (id: string) => void): DataTableColumn<Payment>[] {
  return [
    { id: "date", header: "Date", cellClassName: "text-on-surface", cell: (p) => formatBillingDate(p.createdAt) },
    { id: "amount", header: "Amount", cellClassName: "font-medium text-on-surface", cell: (p) => amount(p.amountInCents, p.currency) },
    {
      id: "method",
      header: "Method",
      cellClassName: "capitalize text-on-surface-variant",
      cell: (p) => p.paymentMethod?.replace("_", " ") ?? "—",
    },
    { id: "status", header: "Status", skeleton: "badge", cell: (p) => <PaymentStatusBadge status={p.status} /> },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (p) => (
        <button
          type="button"
          className={linkButton}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(p.id);
          }}
          aria-label={`View payment from ${formatBillingDate(p.createdAt)}`}
        >
          View
        </button>
      ),
    },
  ];
}

function invoiceColumns(onOpen: (id: string) => void): DataTableColumn<Invoice>[] {
  return [
    { id: "invoice", header: "Invoice", cellClassName: "font-medium text-on-surface", cell: (i) => i.invoiceNumber },
    {
      id: "period",
      header: "Period",
      cellClassName: "text-on-surface-variant",
      cell: (i) => `${formatBillingDate(i.periodStart)} – ${formatBillingDate(i.periodEnd)}`,
    },
    { id: "amount", header: "Amount", cellClassName: "font-medium text-on-surface", cell: (i) => amount(i.amountInCents, i.currency) },
    { id: "status", header: "Status", skeleton: "badge", cell: (i) => <InvoiceStatusBadge status={i.status} /> },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (i) => (
        <button
          type="button"
          className={linkButton}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(i.id);
          }}
          aria-label={`View and download invoice ${i.invoiceNumber}`}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download
        </button>
      ),
    },
  ];
}

const VIEWS = [
  { id: "payments", label: "Payments" },
  { id: "invoices", label: "Invoices" },
];

export function BillingHistory() {
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState("payments");
  const [paymentPage, setPaymentPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const payments = usePayments({ page: paymentPage, limit: PAGE_SIZE });
  const invoices = useInvoices({ page: invoicePage, limit: PAGE_SIZE });
  const { data: payment } = usePayment(paymentId);
  const { data: invoice } = useInvoice(invoiceId);

  const paymentCols = useMemo(() => paymentColumns(setPaymentId), []);
  const invoiceCols = useMemo(() => invoiceColumns(setInvoiceId), []);

  return (
    <section aria-labelledby="history-heading" className={cn(billingCard, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
        <h2 id="history-heading" className="text-title-sm font-semibold text-on-surface">
          Payments and invoices
        </h2>
        <Tabs tabs={VIEWS} activeTab={view} onTabChange={setView} idBase="billing-history" label="History type" />
      </div>

      <div {...tabPanelProps("billing-history", view)} className="outline-none">
        {view === "payments" ? (
          <DataTable
            label="Payments"
            columns={paymentCols}
            rows={payments.data?.data ?? []}
            rowKey={(p) => p.id}
            rowLabel={(p) => `payment from ${formatBillingDate(p.createdAt)}`}
            loading={payments.isLoading}
            skeletonRows={5}
            onRowClick={(p) => setPaymentId(p.id)}
            rowClassName={() => "cursor-pointer"}
            pagination={{
              page: paymentPage - 1,
              pageSize: PAGE_SIZE,
              total: payments.data?.total ?? 0,
              onPageChange: (p) => setPaymentPage(p + 1),
            }}
            empty={{ icon: <CreditCard className="h-10 w-10" />, title: "No payments yet", compact: true }}
          />
        ) : (
          <DataTable
            label="Invoices"
            columns={invoiceCols}
            rows={invoices.data?.data ?? []}
            rowKey={(i) => i.id}
            rowLabel={(i) => `invoice ${i.invoiceNumber}`}
            loading={invoices.isLoading}
            skeletonRows={5}
            onRowClick={(i) => setInvoiceId(i.id)}
            rowClassName={() => "cursor-pointer"}
            pagination={{
              page: invoicePage - 1,
              pageSize: PAGE_SIZE,
              total: invoices.data?.total ?? 0,
              onPageChange: (p) => setInvoicePage(p + 1),
            }}
            empty={{ icon: <FileText className="h-10 w-10" />, title: "No invoices yet", compact: true }}
          />
        )}
      </div>

      <AnimatePresence>
        {paymentId && payment && (
          <PaymentDetailModal key={paymentId} payment={payment} onClose={() => setPaymentId(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {invoiceId && invoice && (
          <InvoiceDetailModal key={invoiceId} invoice={invoice} user={user} onClose={() => setInvoiceId(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
