"use client";

import { X, CreditCard, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import type { Payment } from "@/lib/types/billing";

interface Props {
  payment: Payment;
  onClose: () => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(cents: number, currency: string) {
  const symbol = currency.toUpperCase() === "INR" ? "₹" : "$";
  return `${symbol}${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function StatusIcon({ status }: { status: Payment["status"] }) {
  const map = {
    SUCCEEDED: <CheckCircle className="h-5 w-5 text-success" />,
    PENDING:   <Clock className="h-5 w-5 text-warning" />,
    PROCESSING:<RefreshCw className="h-5 w-5 text-warning animate-spin" />,
    FAILED:    <XCircle className="h-5 w-5 text-error" />,
    REFUNDED:  <AlertTriangle className="h-5 w-5 text-on-surface-variant" />,
  };
  return map[status] ?? null;
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const map: Record<Payment["status"], string> = {
    SUCCEEDED: "bg-success/10 text-success",
    PENDING:   "bg-warning/10 text-warning",
    PROCESSING:"bg-warning/10 text-warning",
    FAILED:    "bg-error/10 text-error",
    REFUNDED:  "bg-surface-container text-on-surface-variant",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${map[status]}`}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-outline-variant/10 last:border-0">
      <span className="text-[12px] text-on-surface-variant w-36 shrink-0">{label}</span>
      <span className="text-[13px] text-on-surface font-medium text-right break-all">{value}</span>
    </div>
  );
}

export function PaymentDetailModal({ payment, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-surface-container-low border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface">Payment Details</p>
              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5 truncate max-w-[220px]">{payment.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount hero */}
        <div className="px-6 py-5 bg-gradient-to-br from-surface-container to-surface-container-low border-b border-outline-variant/10 text-center">
          <p className="text-[28px] font-bold text-on-surface tracking-tight">
            {formatAmount(payment.amountInCents, payment.currency)}
          </p>
          <p className="text-[12px] text-on-surface-variant mt-1">{payment.currency.toUpperCase()}</p>
          <div className="mt-3">
            <StatusBadge status={payment.status} />
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-2">
          <Row label="Payment Date" value={formatDateTime(payment.createdAt)} />
          {payment.paidAt && <Row label="Paid At" value={formatDateTime(payment.paidAt)} />}
          <Row
            label="Method"
            value={
              <span className="capitalize">
                {payment.paymentMethod?.replace("_", " ") ?? "—"}
              </span>
            }
          />
          {payment.failedReason && (
            <Row
              label="Failure Reason"
              value={<span className="text-error">{payment.failedReason}</span>}
            />
          )}
          {payment.retryCount > 0 && (
            <Row label="Retry Attempts" value={payment.retryCount} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-[13px] font-medium text-on-surface-variant"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
