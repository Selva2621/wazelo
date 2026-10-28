import type { ProposalStatus } from "@/lib/api/proposals";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<ProposalStatus, { label: string; variant: "muted" | "info" | "success" | "warning" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  SENT: { label: "Sent", variant: "info" },
  VIEWED: { label: "Viewed", variant: "info" },
  ACCEPTED: { label: "Accepted", variant: "success" },
  CHANGES_REQUESTED: { label: "Changes requested", variant: "warning" },
};

export function ProposalStatusBadge({ status, expired }: { status: ProposalStatus; expired?: boolean }) {
  if (expired) return <Badge dot variant="error">Expired</Badge>;
  const s = STATUS[status];
  return <Badge dot variant={s.variant}>{s.label}</Badge>;
}
