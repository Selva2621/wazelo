import { Badge } from "@/components/ui/badge";
import type { BillingCycle, InvoiceStatus, PaymentStatus, SubscriptionStatus } from "@/lib/types/billing";

type BadgeVariant = "success" | "warning" | "error" | "muted";

export function formatBillingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Plan limit as text: 0 or less means unlimited. */
export function formatLimit(value: number | undefined | null): string {
  if (value == null) return "—";
  if (value <= 0) return "Unlimited";
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))}k`;
  return value.toLocaleString("en-IN");
}

export function cycleSuffix(cycle: BillingCycle): string {
  return cycle === "MONTHLY" ? "/mo" : "/yr";
}

const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  TRIAL: { label: "Trial", variant: "warning" },
  GRACE_PERIOD: { label: "Grace period", variant: "warning" },
  PAST_DUE: { label: "Past due", variant: "error" },
  EXPIRED: { label: "Expired", variant: "error" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  SUCCEEDED: { label: "Paid", variant: "success" },
  PROCESSING: { label: "Processing", variant: "warning" },
  FAILED: { label: "Failed", variant: "error" },
  PENDING: { label: "Pending", variant: "muted" },
  REFUNDED: { label: "Refunded", variant: "muted" },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  PAID: { label: "Paid", variant: "success" },
  OPEN: { label: "Open", variant: "warning" },
  DRAFT: { label: "Draft", variant: "muted" },
  VOID: { label: "Void", variant: "muted" },
  UNCOLLECTIBLE: { label: "Uncollectible", variant: "error" },
};

function StatusBadge({ meta }: { meta: { label: string; variant: BadgeVariant } }) {
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <StatusBadge meta={SUBSCRIPTION_STATUS[status] ?? { label: status, variant: "muted" }} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge meta={PAYMENT_STATUS[status] ?? { label: status, variant: "muted" }} />;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge meta={INVOICE_STATUS[status] ?? { label: status, variant: "muted" }} />;
}

/** One card level (Quiet Ops). */
export const billingCard = "rounded-2xl border border-outline-variant bg-surface-container-lowest";
