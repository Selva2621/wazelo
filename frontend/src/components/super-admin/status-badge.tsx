import { Badge } from "@/components/ui/badge";

type BadgeVariant = "success" | "warning" | "error" | "info" | "muted";

/**
 * Subscription, payment, invoice, org and ticket statuses → Badge variants.
 * success = settled/healthy, warning = needs attention or in flight,
 * info = new or being handled, error = failed, muted = finished/inactive.
 */
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // Subscriptions / orgs
  ACTIVE: "success",
  TRIAL: "info",
  PAST_DUE: "warning",
  GRACE_PERIOD: "warning",
  EXPIRED: "error",
  SUSPENDED: "error",
  CANCELLED: "muted",
  // Payments / invoices
  SUCCEEDED: "success",
  PAID: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  OPEN: "warning",
  WAITING: "warning",
  FAILED: "error",
  UNCOLLECTIBLE: "error",
  REFUNDED: "muted",
  DRAFT: "muted",
  VOID: "muted",
  // Tickets
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "muted",
};

/** PAST_DUE → "Past due" */
export function humanizeStatus(status: string): string {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge dot variant={STATUS_VARIANT[status] ?? "muted"}>{humanizeStatus(status)}</Badge>;
}
